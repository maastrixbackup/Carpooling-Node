const BookingModel = require("../models/booking.model");
const RideModel = require("../models/ride.model");

const generateBookingCode = () => {
  return `CP${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
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

    if (requestedSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "Seats must be greater than 0.",
      });
    }

    const ride = await RideModel.findForBooking(ride_id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not available.",
      });
    }

    if (ride.driver_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own ride.",
      });
    }

    if (ride.available_seats < requestedSeats) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available.",
      });
    }

    const seatUpdated = await RideModel.decreaseAvailableSeats(
      ride.id,
      requestedSeats
    );

    if (!seatUpdated) {
      return res.status(400).json({
        success: false,
        message: "Seats are no longer available.",
      });
    }

    const totalPrice = Number(ride.price_per_seat) * requestedSeats;

    const booking = await BookingModel.createBooking({
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

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: { booking },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.findByPassenger(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully.",
      data: { bookings },
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching bookings.",
    });
  }
};

const getDriverBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.findByDriver(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Driver bookings fetched successfully.",
      data: { bookings },
    });
  } catch (error) {
    console.error("Get driver bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching driver bookings.",
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await BookingModel.findById(req.params.id, req.user.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: { booking },
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching booking.",
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await BookingModel.findById(req.params.id, req.user.id);

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

    const updated = await BookingModel.updateStatus(
      booking.id,
      req.user.id,
      "cancelled"
    );

    if (updated) {
      await RideModel.increaseAvailableSeats(booking.ride_id, booking.seats);
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

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