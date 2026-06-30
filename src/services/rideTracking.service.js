const { supabaseAdmin } = require("../config/supabase");
const RideModel = require("../models/ride.model");
const BookingModel = require("../models/booking.model");
const RideLiveLocationModel = require("../models/rideLiveLocation.model");

const TRACKABLE_BOOKING_STATUSES = [
  "accepted",
  "ongoing",
  "payment_confirmed",
  "completed",
];

const rideRoom = (rideId) => `ride-${rideId}`;

function normalizeLocationPayload(payload = {}) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    rideId: payload.rideId,
    latitude,
    longitude,
    heading: payload.heading == null ? null : Number(payload.heading),
    speed: payload.speed == null ? null : Number(payload.speed),
    accuracy: payload.accuracy == null ? null : Number(payload.accuracy),
  };
}

const RideTrackingService = {
  rideRoom,

  async canJoinRideTracking({ rideId, userId }) {
    if (!rideId || !userId) return false;

    const ride =
      typeof RideModel.findById === "function"
        ? await RideModel.findById(supabaseAdmin, rideId)
        : null;

    if (ride && String(ride.driver_id) === String(userId)) {
      return true;
    }

    const bookings = await BookingModel.findByPassenger(supabaseAdmin, userId);

    return bookings.some((booking) => {
      const bookingRideId = booking.rides?.id || booking.ride_id;
      const status = String(booking.status || "").toLowerCase();

      return (
        String(bookingRideId) === String(rideId) &&
        TRACKABLE_BOOKING_STATUSES.includes(status)
      );
    });
  },

  async getSnapshot(rideId) {
    const liveLocation = await RideLiveLocationModel.getByRideId(
      supabaseAdmin,
      rideId,
    );

    if (!liveLocation || liveLocation.status !== "active") {
      return null;
    }

    return {
      rideId,
      driverId: liveLocation.driver_id,
      latitude: Number(liveLocation.latitude),
      longitude: Number(liveLocation.longitude),
      heading:
        liveLocation.heading == null ? null : Number(liveLocation.heading),
      speed: liveLocation.speed == null ? null : Number(liveLocation.speed),
      accuracy:
        liveLocation.accuracy == null ? null : Number(liveLocation.accuracy),
      updatedAt: liveLocation.updated_at,
    };
  },

  async updateDriverLocation({ payload, driverId }) {
    const location = normalizeLocationPayload(payload);

    if (!location || !location.rideId || !driverId) {
      return {
        success: false,
        reason: "invalid_payload",
      };
    }

    const ride = await RideModel.findDriverRideById(
      supabaseAdmin,
      location.rideId,
      driverId,
    );

    if (!ride) {
      return {
        success: false,
        reason: "ride_not_found_or_not_owner",
      };
    }

    if (ride.status !== "ongoing") {
      return {
        success: false,
        reason: "ride_not_ongoing",
      };
    }

    const liveLocation = await RideLiveLocationModel.upsertLocation(
      supabaseAdmin,
      {
        rideId: location.rideId,
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
      },
    );

    return {
      success: true,
      data: {
        rideId: location.rideId,
        driverId,
        latitude: Number(liveLocation.latitude),
        longitude: Number(liveLocation.longitude),
        heading:
          liveLocation.heading == null ? null : Number(liveLocation.heading),
        speed: liveLocation.speed == null ? null : Number(liveLocation.speed),
        accuracy:
          liveLocation.accuracy == null ? null : Number(liveLocation.accuracy),
        updatedAt: liveLocation.updated_at,
      },
    };
  },

  async stopTracking({ rideId, driverId }) {
    if (!rideId || !driverId) {
      return {
        success: false,
        reason: "missing_required_fields",
      };
    }

    const ride = await RideModel.findDriverRideById(
      supabaseAdmin,
      rideId,
      driverId,
    );

    if (!ride) {
      return {
        success: false,
        reason: "ride_not_found_or_not_owner",
      };
    }

    await RideLiveLocationModel.stopTracking(supabaseAdmin, rideId);

    return {
      success: true,
      data: {
        rideId,
        status: "stopped",
      },
    };
  },
};

module.exports = RideTrackingService;