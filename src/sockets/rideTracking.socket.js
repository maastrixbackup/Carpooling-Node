const RideTrackingService = require("../services/rideTracking.service");

function emitTrackingError(socket, reason, message) {
  socket.emit("ride:tracking:error", {
    reason,
    message,
  });
}

function registerRideTrackingSocket(io) {
  io.on("connection", (socket) => {
    socket.on("ride:tracking:join", async ({ rideId }) => {
      try {
        const userId = socket.user?.id;

        if (!rideId || !userId) {
          emitTrackingError(
            socket,
            "missing_required_fields",
            "Ride tracking details are missing.",
          );
          return;
        }

        const allowed = await RideTrackingService.canJoinRideTracking({
          rideId,
          userId,
        });

        if (!allowed) {
          emitTrackingError(
            socket,
            "access_denied",
            "You are not allowed to track this ride.",
          );
          return;
        }

        socket.join(RideTrackingService.rideRoom(rideId));

        socket.emit("ride:tracking:joined", {
          rideId,
          room: RideTrackingService.rideRoom(rideId),
        });

        const snapshot = await RideTrackingService.getSnapshot(rideId);

        if (snapshot) {
          socket.emit("ride:tracking:snapshot", snapshot);
        }
      } catch (error) {
        console.error("[SOCKET] ride tracking join error:", error?.message || error);

        emitTrackingError(
          socket,
          "join_failed",
          "Unable to join ride tracking.",
        );
      }
    });

    socket.on("ride:tracking:leave", ({ rideId }) => {
      if (!rideId) return;

      socket.leave(RideTrackingService.rideRoom(rideId));

      socket.emit("ride:tracking:left", {
        rideId,
      });
    });

    socket.on("ride:tracking:update", async (payload = {}) => {
      try {
        const driverId = socket.user?.id;

        const result = await RideTrackingService.updateDriverLocation({
          payload,
          driverId,
        });

        if (!result.success) {
          emitTrackingError(
            socket,
            result.reason,
            "Unable to update live location.",
          );
          return;
        }

        io.to(RideTrackingService.rideRoom(result.data.rideId)).emit(
          "ride:tracking:update",
          result.data,
        );
      } catch (error) {
        console.error(
          "[SOCKET] ride tracking update error:",
          error?.message || error,
        );

        emitTrackingError(
          socket,
          "location_update_failed",
          "Unable to update live location.",
        );
      }
    });

    socket.on("ride:tracking:stop", async ({ rideId }) => {
      try {
        const driverId = socket.user?.id;

        const result = await RideTrackingService.stopTracking({
          rideId,
          driverId,
        });

        if (!result.success) {
          emitTrackingError(
            socket,
            result.reason,
            "Unable to stop ride tracking.",
          );
          return;
        }

        io.to(RideTrackingService.rideRoom(rideId)).emit(
          "ride:tracking:stopped",
          result.data,
        );
      } catch (error) {
        console.error("[SOCKET] ride tracking stop error:", error?.message || error);

        emitTrackingError(
          socket,
          "tracking_stop_failed",
          "Unable to stop ride tracking.",
        );
      }
    });
  });
}

module.exports = registerRideTrackingSocket;