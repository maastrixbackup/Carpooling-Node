const { supabaseAdmin } = require("../config/supabase");
const RewardModel = require("../models/reward.model");

function mapTransaction(item) {
  return {
    id: String(item.id),
    points: Number(item.points || 0),
    type: item.transaction_type,
    title: getTransactionTitle(item.transaction_type),
    description: item.description || "",
    referenceId: item.reference_id ? String(item.reference_id) : null,
    createdAt: item.created_at,
  };
}

function getTransactionTitle(type) {
  const titles = {
    ride_completed_driver: "Ride completed as driver",
    ride_completed_passenger: "Ride completed as passenger",
    referral_bonus: "Referral bonus",
    profile_verified: "Profile verified",
    redeem: "Reward redeemed",
  };

  return titles[type] || "Reward activity";
}

function getUserLevel(points) {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
}

function getRedeemValue(points) {
  return Number((Number(points || 0) / 10).toFixed(2));
}

const getMyRewards = async (req, res) => {
  try {
    const userId = req.user.id;
    const [wallet, transactions, stats] = await Promise.all([
      RewardModel.getWallet(supabaseAdmin, userId),
      RewardModel.getTransactions(supabaseAdmin, userId, 20),
      RewardModel.getRewardStats(supabaseAdmin, userId),
    ]);

    const pointsBalance = Number(wallet.points_balance || 0);

    return res.status(200).json({
      success: true,
      message: "Rewards fetched successfully.",
      data: {
        rewards: {
          pointsBalance,
          totalPointsEarned: Number(wallet.total_points_earned || 0),
          totalPointsRedeemed: Number(wallet.total_points_redeemed || 0),
          redeemValue: getRedeemValue(pointsBalance),
          conversionRate: "10 points = ₹1",
          level: getUserLevel(pointsBalance),
          completedDrives: stats.completedDrives,
          completedJourneys: stats.completedJourneys,
          completedRides: stats.completedDrives + stats.completedJourneys,
          referrals: stats.referrals,

          transactions: transactions.map(mapTransaction),
        },
      },
    });
  } catch (error) {
    console.error("[ERROR] Get rewards:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching rewards.",
    });
  }
};

module.exports = {
  getMyRewards,
};
