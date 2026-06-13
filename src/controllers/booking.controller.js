const { supabaseAdmin } = require("../config/supabase");
const BookingModel = require("../models/booking.model");
const ChatModel = require("../models/chat/chat.model");
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
    const ride = await RideModel.findForBooking(supabaseAdmin, ride_id);

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
        supabaseAdmin,
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
      supabaseAdmin,
      ride.id,
      requestedSeats,
    );

    if (!seatUpdated) {
      return res.status(400).json({
        success: false,
        message: "Seats are no longer available.",
      });
    }

    const distanceKm = Number(ride.distance_meters || 0) / 1000;

    const totalPrice = Number(
      (Number(ride.price_per_km || 0) * distanceKm * requestedSeats).toFixed(2),
    );

    const booking = await BookingModel.createBooking(supabaseAdmin, {
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
      body: "Your seat reservation has been successfully booked.",
      data: {
        screen: "booking",
        bookingId: booking.id,
        type: "booking_created",
      },
    });

    // const room = await ChatModel.createRoom(supabaseAdmin, {
    //   bookingId: booking.id,
    //   rideId: ride.id,
    //   passengerId: req.user.id,
    //   driverId: ride.driver_id,
    // });

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

function mapBookingToUi(booking) {
  const ride = booking.rides || {};
  const driver = ride.user_details || {};
  const vehicle = ride.vehicles || {};

  return {
    id: String(booking.id),
    code: booking.booking_code,

    from: booking.ride_source || ride.source_address || "",
    to: booking.ride_destination || ride.destination_address || "",

    pickup: booking.ride_source || ride.source_address || "",
    drop: booking.ride_destination || ride.destination_address || "",

    date: booking.ride_date,
    time: booking.ride_time,

    price: Number(booking.total_price || 0),
    seats: Number(booking.seats || 0),

    driver: driver.full_name || "Driver",

    car: `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Vehicle",

    paymentStatus: booking.payment_status,
    bookingStatus: booking.status,
  };
}

const getMyBookings = async (req, res) => {
  try {
    const rawBookings = await BookingModel.findByPassenger(
      supabaseAdmin,
      req.user.id,
    );
    const bookings = rawBookings.map(mapBookingToUi);

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

function mapBookingDetailsToUi(booking, hasReviewed = false) {
  const ride = booking.rides || {};
  const driver = ride.user_details || {};
  const vehicle = ride.vehicles || {};

  const from = booking.ride_source || ride.source_address || "";

  const to = booking.ride_destination || ride.destination_address || "";

  return {
    id: String(booking.id),
    code: booking.booking_code,
    rideId: String(booking.ride_id),

    from,
    to,
    fullFrom: from,
    fullTo: to,

    sourceLat: Number(booking.ride_source_lat || ride.source_lat || 0),
    sourceLng: Number(booking.ride_source_lng || ride.source_lng || 0),
    destinationLat: Number(
      booking.ride_destination_lat || ride.destination_lat || 0,
    ),
    destinationLng: Number(
      booking.ride_destination_lng || ride.destination_lng || 0,
    ),

    date: booking.ride_date || ride.ride_date || "",
    time: booking.ride_time || ride.departure_time || "",

    seats: Number(booking.seats || 0),
    pricePerSeat: Number(booking.price_per_seat || 0),
    totalPrice: Number(booking.total_price || 0),

    status: booking.status,
    paymentStatus: booking.payment_status,
    paymentType: booking.payment_type || "cash",

    driverName: driver.full_name || "Driver",
    driverPhone: driver.phone || null,
    driverId: ride.driver_id,

    car: `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Vehicle",

    registrationNumber: vehicle.registration_number || "",

    color: vehicle.color || "",

    hasReviewed: Boolean(hasReviewed),
  };
}

const getBookingById = async (req, res) => {
  try {
    const booking = await BookingModel.findById(
      supabaseAdmin,
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
      supabaseAdmin,
      booking.id,
    );

    const mappedBooking = mapBookingDetailsToUi(booking, hasReviewed);

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: {
        booking: mappedBooking,
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

const respondToBooking = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected.",
      });
    }

    const booking = await BookingModel.findById(
      supabaseAdmin,
      req.params.id,
      req.user.id,
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isDriver = String(booking.rides?.driver_id) === String(req.user.id);
    if (!isDriver) {
      return res.status(403).json({
        success: false,
        message: "Only the ride driver can respond to this booking.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}.`,
      });
    }

    const updated = await BookingModel.updateStatus(
      supabaseAdmin,
      booking.id,
      req.user.id,
      status,
    );

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Unable to update booking.",
      });
    }

    let chatRoom = null;

    if (status === "accepted") {
      const existingRoom = await ChatModel.getRoomByBookingId(
        supabaseAdmin,
        booking.id,
      );

      chatRoom = existingRoom;

      if (!chatRoom) {
        chatRoom = await ChatModel.createRoom(supabaseAdmin, {
          bookingId: booking.id,
          rideId: booking.ride_id,
          passengerId: booking.passenger_id,
          driverId: booking.rides.driver_id,
        });
      }

      await sendPushToUsers({
        userIds: [booking.passenger_id],
        title: "Ride Accepted",
        body: "Your booking has been accepted. You can now chat with the driver.",
        data: {
          screen: "booking",
          bookingId: booking.id,
          roomId: chatRoom.id,
          type: "booking_accepted",
        },
      });
    }

    if (status === "rejected") {
      await RideModel.increaseAvailableSeats(
        supabaseAdmin,
        booking.ride_id,
        booking.seats,
      );

      await sendPushToUsers({
        userIds: [booking.passenger_id],
        title: "Ride Request Rejected",
        body: "Your ride booking request was rejected by the driver.",
        data: {
          screen: "booking",
          bookingId: booking.id,
          type: "booking_rejected",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message:
        status === "accepted"
          ? "Booking accepted successfully."
          : "Booking rejected successfully.",
      data: {
        booking_id: booking.id,
        status,
        chat_room: chatRoom,
      },
    });
  } catch (error) {
    console.error("[ERROR] Respond booking:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while responding to booking.",
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await BookingModel.findById(
      supabaseAdmin,
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
      supabaseAdmin,
      booking.id,
      req.user.id,
      "cancelled",
    );

    if (updated) {
      await RideModel.increaseAvailableSeats(
        supabaseAdmin,
        booking.ride_id,
        booking.seats,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    logError("CANCEL BOOKING", error);
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
  respondToBooking
};
