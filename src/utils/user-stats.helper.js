// utils/user-stats.helper.js

const { supabaseAdmin } = require("../config/supabase");

async function incrementUserTotalRides(userId) {
  const { error } = await supabaseAdmin.rpc("increment_total_rides", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

module.exports = {
  incrementUserTotalRides,
};
