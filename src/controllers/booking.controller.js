const BookingModel = require("../models/booking.model");
const reviewModel = require("../models/review.model");
const RideModel = require("../models/ride.model");
const { sendPushToUsers } = require("../services/notification.service");
const { logError } = require("../utils/logger");

const generateBookingCode = () => {
  return `CP${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
};

const getDisplayName = (user) => {
  return (
    user?.metadata?.full_name ||
    user?.metadata?.name ||
    user?.email ||
    "Passenger"
  );
};

const createBooking = async (req, res) => {
  try {
    const { ride_id, seats } = req.body;

    if (!ride_id || !seats) {
      return res.status(400).json({
        success: false,
        message: "Ride ID and seats are required.",
      });
    }

    const requestedSeats = Number(seats);

    if (!Number.isFinite(requestedSeats) || requestedSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "Seats must be greater than 0.",
      });
    }

    const ride = await RideModel.findForBooking(req.supabase, ride_id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not available.",
      });
    }

    if (String(ride.driver_id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own ride.",
      });
    }

    const existingBooking =
      await BookingModel.findActiveBookingByPassengerAndRide(
        req.supabase,
        req.user.id,
        ride.id,
      );

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You have already booked this ride.",
      });
    }

    if (Number(ride.available_seats) < requestedSeats) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available.",
      });
    }

    const seatUpdated = await RideModel.decreaseAvailableSeats(
      req.supabase,
      ride.id,
      requestedSeats,
    );

    if (!seatUpdated) {
      return res.status(400).json({
        success: false,
        message: "Seats are no longer available.",
      });
    }

    const totalPrice = Number(ride.price_per_seat) * requestedSeats;

    const booking = await BookingModel.createBooking(req.supabase, {
      bookingCode: generateBookingCode(),
      rideId: ride.id,
      passengerId: req.user.id,
      seats: requestedSeats,
      rideSource: ride.source_address,
      rideDestination: ride.destination_address,
      rideSourceLat: ride.source_lat,
      rideSourceLng: ride.source_lng,
      rideDestinationLat: ride.destination_lat,
      rideDestinationLng: ride.destination_lng,
      rideDate: ride.ride_date,
      rideTime: ride.departure_time,
      pricePerSeat: ride.price_per_seat,
      totalPrice,
    });

    const passengerName = getDisplayName(req.user);

    await sendPushToUsers({
      userIds: [ride.driver_id],
      title: "New Ride Booking",
      body: `${passengerName} has reserved ${requestedSeats} seat${
        requestedSeats > 1 ? "s" : ""
      } on your upcoming trip.`,
      data: {
        screen: "driver-ride",
        rideId: ride.id,
        type: "booking_created",
      },
    });

    await sendPushToUsers({
      userIds: [req.user.id],
      title: "Booking Confirmed",
      body: "Your seat reservation has been successfully confirmed.",
      data: {
        screen: "booking",
        bookingId: booking.id,
        type: "booking_created",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: { booking },
    });
  } catch (error) {
    console.error("[ERROR] Create booking:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.findByPassenger(
      req.supabase,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully.",
      data: { bookings },
    });
  } catch (error) {
    console.error("[ERROR] Get my bookings:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching bookings.",
    });
  }
};

const getDriverBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.findByDriver(req.supabase, {
      driverId: req.user.id,
      rideId: req.query.ride_id,
    });

    return res.status(200).json({
      success: true,
      message: "Driver bookings fetched successfully.",
      data: { bookings },
    });
  } catch (error) {
    console.error("[ERROR] Get driver bookings:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching driver bookings.",
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await BookingModel.findById(
      req.supabase,
      req.params.id,
      req.user.id,
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const hasReviewed = await reviewModel.hasReviewed(
      req.supabase,
      booking.id,
    );

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: {
        booking: {
          ...booking,
          has_reviewed: hasReviewed,
        },
      },
    });
  } catch (error) {
    console.error("[ERROR] Get booking:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching booking.",
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await BookingModel.findById(
      req.supabase,
      req.params.id,
      req.user.id,
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled.",
      });
    }

    if (["completed", "ongoing"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "This booking can no longer be cancelled.",
      });
    }

    const updated = await BookingModel.updateStatus(
      req.supabase,
      booking.id,
      req.user.id,
      "cancelled",
    );

    if (updated) {
      await RideModel.increaseAvailableSeats(
        req.supabase,
        booking.ride_id,
        booking.seats,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    logError("CANCEL BOOKING", error)
    console.error("[ERROR] Cancel booking:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling booking.",
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getDriverBookings,
  getBookingById,
  cancelBooking,
};