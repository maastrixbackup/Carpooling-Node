const { sendPushToUsers } = require("./notification.service");

const NOTIFICATION_TYPES = {
  BOOKING_CREATED: "booking_created",
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_REJECTED: "booking_rejected",
  RIDE_STARTED: "ride_started",
  RIDE_COMPLETED: "ride_completed",
  MESSAGE_RECEIVED: "message_received",
  REWARD_EARNED: "reward_earned",
};

async function notifyBookingCreated({ passengerId, driverId, bookingId, rideId }) {
  await Promise.all([
    sendPushToUsers({
      userIds: [passengerId],
      title: "Booking Confirmed",
      body: "Your seat reservation has been successfully booked.",
      data: {
        screen: "booking",
        bookingId,
        rideId,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
      },
    }),

    sendPushToUsers({
      userIds: [driverId],
      title: "New Booking Request",
      body: "A passenger booked a seat on your ride.",
      data: {
        screen: "driver_booking",
        bookingId,
        rideId,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
      },
    }),
  ]);
}

async function notifyBookingAccepted({ passengerId, bookingId, rideId }) {
  return sendPushToUsers({
    userIds: [passengerId],
    title: "Booking Accepted",
    body: "Your booking has been accepted by the driver.",
    data: {
      screen: "booking",
      bookingId,
      rideId,
      type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    },
  });
}

async function notifyBookingRejected({ passengerId, bookingId, rideId }) {
  return sendPushToUsers({
    userIds: [passengerId],
    title: "Booking Rejected",
    body: "Your booking was not accepted by the driver.",
    data: {
      screen: "booking",
      bookingId,
      rideId,
      type: NOTIFICATION_TYPES.BOOKING_REJECTED,
    },
  });
}

async function notifyRideStarted({ passengerIds = [], driverId, rideId }) {
  const userIds = [...new Set([...passengerIds, driverId].filter(Boolean))];

  return sendPushToUsers({
    userIds,
    title: "Ride Started",
    body: "Your ride has started. Travel safely.",
    data: {
      screen: "ride",
      rideId,
      type: NOTIFICATION_TYPES.RIDE_STARTED,
    },
  });
}

async function notifyRideCompleted({ passengerIds = [], driverId, rideId }) {
  const userIds = [...new Set([...passengerIds, driverId].filter(Boolean))];

  return sendPushToUsers({
    userIds,
    title: "Ride Completed",
    body: "Your ride has been completed successfully.",
    data: {
      screen: "ride",
      rideId,
      type: NOTIFICATION_TYPES.RIDE_COMPLETED,
    },
  });
}

async function notifyIncomingMessage({
  receiverId,
  senderName,
  roomId,
  bookingId,
  rideId,
}) {
  return sendPushToUsers({
    userIds: [receiverId],
    title: senderName || "New Message",
    body: "You have a new ride message.",
    data: {
      screen: "chat",
      roomId,
      bookingId,
      rideId,
      type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    },
  });
}

async function notifyRewardEarned({ userId, points, rideId }) {
  return sendPushToUsers({
    userIds: [userId],
    title: "Reward Points Added",
    body: `You earned ${points} reward points.`,
    data: {
      screen: "rewards",
      rideId,
      type: NOTIFICATION_TYPES.REWARD_EARNED,
    },
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