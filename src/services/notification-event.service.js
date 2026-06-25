const { notifyUsers } = require("./notification.service");

const NOTIFICATION_TYPES = {
  BOOKING_CREATED: "booking_created",
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_REJECTED: "booking_rejected",
  RIDE_STARTED: "ride_started",
  RIDE_COMPLETED: "ride_completed",
  MESSAGE_RECEIVED: "message_received",
  REWARD_EARNED: "reward_earned",
};

function uniqueIds(ids = []) {
  return [...new Set(ids.filter(Boolean).map(String))];
}

async function notifyBookingCreated({
  passengerId,
  driverId,
  bookingId,
  rideId,
  passengerName = "A passenger",
  from,
  to,
}) {
  const tasks = [];

  if (driverId) {
    tasks.push(
      notifyUsers({
        userIds: [driverId],
        title: "New Booking Request",
        body: `${passengerName} booked your ride. Review and accept the request.`,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        referenceType: "booking",
        referenceId: bookingId,
        data: {
          screen: "driver-ride",
          bookingId,
          rideId,
          from,
          to,
        },
        priority: "high",
        saveHistory: true,
      }),
    );
  }

  if (passengerId) {
    tasks.push(
      notifyUsers({
        userIds: [passengerId],
        title: "Booking Requested",
        body: "Your booking request was sent. Waiting for driver confirmation.",
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        referenceType: "booking",
        referenceId: bookingId,
        data: {
          screen: "booking",
          bookingId,
          rideId,
          from,
          to,
        },
        priority: "normal",
        saveHistory: true,
      }),
    );
  }

  return Promise.allSettled(tasks);
}

async function notifyBookingAccepted({ passengerId, bookingId, rideId }) {
  if (!passengerId) return null;

  return notifyUsers({
    userIds: [passengerId],
    title: "Booking Accepted",
    body: "Your booking has been accepted by the driver.",
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    referenceType: "booking",
    referenceId: bookingId,
    data: {
      screen: "booking",
      bookingId,
      rideId,
    },
    priority: "high",
    saveHistory: true,
  });
}

async function notifyBookingRejected({ passengerId, bookingId, rideId }) {
  if (!passengerId) return null;

  return notifyUsers({
    userIds: [passengerId],
    title: "Booking Rejected",
    body: "Your booking was not accepted by the driver.",
    type: NOTIFICATION_TYPES.BOOKING_REJECTED,
    referenceType: "booking",
    referenceId: bookingId,
    data: {
      screen: "booking",
      bookingId,
      rideId,
    },
    priority: "normal",
    saveHistory: true,
  });
}

async function notifyRideStarted({ passengerIds = [], driverId, rideId }) {
  const userIds = uniqueIds([...passengerIds, driverId]);

  if (!userIds.length) return null;

  return notifyUsers({
    userIds,
    title: "Ride Started",
    body: "Your ride has started. Travel safely.",
    type: NOTIFICATION_TYPES.RIDE_STARTED,
    referenceType: "ride",
    referenceId: rideId,
    data: {
      screen: "ride",
      rideId,
    },
    priority: "high",
    saveHistory: true,
  });
}

async function notifyRideCompleted({ passengerIds = [], driverId, rideId }) {
  const userIds = uniqueIds([...passengerIds, driverId]);

  if (!userIds.length) return null;

  return notifyUsers({
    userIds,
    title: "Ride Completed",
    body: "Your ride has been completed successfully.",
    type: NOTIFICATION_TYPES.RIDE_COMPLETED,
    referenceType: "ride",
    referenceId: rideId,
    data: {
      screen: "ride",
      rideId,
    },
    priority: "normal",
    saveHistory: true,
  });
}

async function notifyIncomingMessage({
  receiverId,
  senderName,
  roomId,
  bookingId,
  rideId,
}) {
  if (!receiverId) return null;

  return notifyUsers({
    userIds: [receiverId],
    title: senderName ? `Message from ${senderName}` : "New Message",
    body: "You have a new ride message.",
    type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    referenceType: "chat_room",
    referenceId: roomId,
    data: {
      screen: "chat",
      roomId,
      bookingId,
      rideId,
      title: senderName || "Chat",
    },
    priority: "high",
    saveHistory: true,
  });
}

async function notifyRewardEarned({ userId, points, rideId }) {
  if (!userId) return null;

  return notifyUsers({
    userIds: [userId],
    title: "Reward Points Added",
    body: `You earned ${points} reward points.`,
    type: NOTIFICATION_TYPES.REWARD_EARNED,
    referenceType: "reward",
    referenceId: rideId || null,
    data: {
      screen: "rewards",
      rideId,
      points,
    },
    priority: "normal",
    saveHistory: true,
  });
}

module.exports = {
  NOTIFICATION_TYPES,
  notifyBookingCreated,
  notifyBookingAccepted,
  notifyBookingRejected,
  notifyRideStarted,
  notifyRideCompleted,
  notifyIncomingMessage,
  notifyRewardEarned,
};
