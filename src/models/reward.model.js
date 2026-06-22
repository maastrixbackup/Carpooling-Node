const RewardModel = {
  async getWallet(supabase, userId) {
    const { data, error } = await supabase
      .from("reward_wallets")
      .select(
        `
        user_id,
        points_balance,
        total_points_earned,
        total_points_redeemed,
        created_at,
        updated_at
      `,
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return (
      data || {
        user_id: userId,
        points_balance: 0,
        total_points_earned: 0,
        total_points_redeemed: 0,
      }
    );
  },

  async getTransactions(supabase, userId, limit = 20) {
    const { data, error } = await supabase
      .from("reward_transactions")
      .select(
        `
        id,
        points,
        transaction_type,
        description,
        reference_id,
        created_at
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  },

  async getRewardStats(supabase, userId) {
  const { count: completedDrives, error: drivesError } = await supabase
    .from("rides")
    .select("id", { count: "exact", head: true })
    .eq("driver_id", userId)
    .eq("status", "completed");

  if (drivesError) throw drivesError;

  const { count: completedJourneys, error: journeysError } = await supabase
    .from("ride_bookings")
    .select("id", { count: "exact", head: true })
    .eq("passenger_id", userId)
    .eq("status", "completed");

  if (journeysError) throw journeysError;

  return {
    completedDrives: completedDrives || 0,
    completedJourneys: completedJourneys || 0,
    referrals: 0,
  };
}
};

module.exports = RewardModel;