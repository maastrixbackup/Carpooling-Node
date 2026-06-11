const { supabaseAdmin } = require("../../config/supabase");

const PushTokenModel = {
  async upsert({ userId, expoPushToken, deviceType, deviceName }) {
    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_type: deviceType || "unknown",
          device_name: deviceName || null,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,expo_push_token",
        },
      )
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async incrementReceived(userId) {
    const { data: tokens, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, notifications_received")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;

    if (!tokens?.length) return;

    const updates = tokens.map((token) => ({
      id: token.id,
      notifications_received: Number(token.notifications_received || 0) + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error: updateError } = await supabaseAdmin
      .from("user_push_tokens")
      .upsert(updates, {
        onConflict: "id",
      });

    if (updateError) throw updateError;
  },

  async deactivateToken(userId, expoPushToken) {
    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("expo_push_token", expoPushToken)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },
};

module.exports = PushTokenModel;