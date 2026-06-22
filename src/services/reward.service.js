const { supabaseAdmin } = require("../config/supabase");

const REWARD_POINTS = {
  RIDE_COMPLETED_DRIVER: 10,
  RIDE_COMPLETED_PASSENGER: 5,
};

const REWARD_TYPES = {
  RIDE_COMPLETED_DRIVER: "ride_completed_driver",
  RIDE_COMPLETED_PASSENGER: "ride_completed_passenger",
};

async function addRewardPoints({
  userId,
  points,
  type,
  description,
  referenceId = null,
}) {
  if (!userId || !points || !type) return null;

  const { error } = await supabaseAdmin.rpc("add_reward_points", {
    p_user_id: userId,
    p_points: points,
    p_type: type,
    p_description: description || null,
    p_reference_id: referenceId,
  });

  if (error) throw error;

  return true;
}

async function rewardDriverForCompletedRide({ driverId, rideId }) {
  return addRewardPoints({
    userId: driverId,
    points: REWARD_POINTS.RIDE_COMPLETED_DRIVER,
    type: REWARD_TYPES.RIDE_COMPLETED_DRIVER,
    description: "Completed ride as driver",
    referenceId: rideId,
  });
}

async function rewardPassengerForCompletedRide({ passengerId, rideId }) {
  return addRewardPoints({
    userId: passengerId,
    points: REWARD_POINTS.RIDE_COMPLETED_PASSENGER,
    type: REWARD_TYPES.RIDE_COMPLETED_PASSENGER,
    description: "Completed ride as passenger",
    referenceId: rideId,
  });
}

async function rewardCompletedRide({ ride, bookings = [] }) {
  if (!ride?.id || !ride?.driver_id) return;

  await rewardDriverForCompletedRide({
    driverId: ride.driver_id,
    rideId: ride.id,
  });

  const completedBookings = bookings.filter((booking) =>
    ["accepted", "completed", "payment_confirmed"].includes(booking.status),
  );

  for (const booking of completedBookings) {
    if (!booking.passenger_id) continue;

    await rewardPassengerForCompletedRide({
      passengerId: booking.passenger_id,
      rideId: ride.id,
    });
  }
}

module.exports = {
  REWARD_POINTS,
  REWARD_TYPES,
  addRewardPoints,
  rewardDriverForCompletedRide,
  rewardPassengerForCompletedRide,
  rewardCompletedRide,
};