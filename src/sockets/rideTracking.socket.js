const { supabaseAdmin } = require("../config/supabase");
const RideModel = require("../models/ride.model");
const BookingModel = require("../models/booking.model");
const RideLiveLocationModel = require("../models/rideLiveLocation.model");

async function canJoinRideTracking({ rideId, userId }) {
  const ride = typeof RideModel.findById === "function"
      ? await RideModel.findById(supabaseAdmin, rideId)
      : null;

  if (ride && String(ride.driver_id) === String(userId)) {
    return true;
  }

  const bookings = await BookingModel.findByPassenger(supabaseAdmin, userId);

  return bookings.some(
    (booking) =>
      String(booking.rides?.id || booking.ride_id) === String(rideId) &&
      ["accepted", "ongoing", "payment_confirmed", "completed"].includes(
        String(booking.status).toLowerCase(),
      ),
  );
}

function registerRideTrackingSocket(io) {
  io.on("connection", (socket) => {
    socket.on("ride:join", async ({ rideId }) => {
      const userId = socket.user.id;
      try {
        if (!rideId || !userId) return;

        const allowed = await canJoinRideTracking({ rideId, userId });

        if (!allowed) {
          socket.emit("ride:tracking:error", {
            message: "You are not allowed to track this ride.",
          });
          return;
        }

        socket.join(`ride-${rideId}`);

        const liveLocation = await RideLiveLocationModel.getByRideId(
          supabaseAdmin,
          rideId,
        );

        if (liveLocation?.status === "active") {
          socket.emit("ride:location:broadcast", {
            rideId,
            driverId: liveLocation.driver_id,
            latitude: Number(liveLocation.latitude),
            longitude: Number(liveLocation.longitude),
            heading: liveLocation.heading,
            speed: liveLocation.speed,
            accuracy: liveLocation.accuracy,
            updatedAt: liveLocation.updated_at,
          });
        }
      } catch (error) {
        console.error("[SOCKET] ride join error:", error?.message || error);
      }
    });

    socket.on("ride:leave", ({ rideId }) => {
      if (!rideId) return;
      socket.leave(`ride-${rideId}`);
    });

    socket.on("ride:location:update", async (payload) => {
      try {
        const { rideId, latitude, longitude, heading, speed, accuracy } =
          payload || {};
        const driverId = socket.user.id;

        if (!rideId || !driverId || latitude == null || longitude == null) {
          return;
        }

        const ride = await RideModel.findDriverRideById(
          supabaseAdmin,
          rideId,
          driverId,
        );

        if (!ride || ride.status !== "ongoing") {
          return;
        }

        const liveLocation = await RideLiveLocationModel.upsertLocation(
          supabaseAdmin,
          {
            rideId,
            driverId,
            latitude,
            longitude,
            heading,
            speed,
            accuracy,
          },
        );

        io.to(`ride-${rideId}`).emit("ride:location:broadcast", {
          rideId,
          driverId,
          latitude: Number(liveLocation.latitude),
          longitude: Number(liveLocation.longitude),
          heading: liveLocation.heading,
          speed: liveLocation.speed,
          accuracy: liveLocation.accuracy,
          updatedAt: liveLocation.updated_at,
        });
      } catch (error) {
        console.error(
          "[SOCKET] ride location update error:",
          error?.message || error,
        );
      }
    });

    socket.on("ride:tracking:stop", async ({ rideId }) => {
      const driverId = socket.user.id;
      try {
        if (!rideId || !driverId) return;

        const ride = await RideModel.findDriverRideById(
          supabaseAdmin,
          rideId,
          driverId,
        );

        if (!ride) return;

        await RideLiveLocationModel.stopTracking(supabaseAdmin, rideId);

        io.to(`ride-${rideId}`).emit("ride:tracking:stopped", {
          rideId,
          status: "stopped",
        });
      } catch (error) {
        console.error(
          "[SOCKET] ride tracking stop error:",
          error?.message || error,
        );
      }
    });
  });
}

module.exports = registerRideTrackingSocket;
