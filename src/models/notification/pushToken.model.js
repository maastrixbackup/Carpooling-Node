const { supabaseAdmin } = require("../../config/supabase");

const VALID_DEVICE_TYPES = ["ios", "android", "web", "unknown"];

function normalizeDeviceType(deviceType) {
  const value = String(deviceType || "unknown").toLowerCase();
  return VALID_DEVICE_TYPES.includes(value) ? value : "unknown";
}

const PushTokenModel = {
  async upsert({
    userId,
    expoPushToken,
    deviceType = "unknown",
    deviceName = null,
    deviceId = null,
    appVersion = null,
    buildNumber = null,
    osVersion = null,
  }) {
    if (!userId) throw new Error("userId is required.");
    if (!expoPushToken) throw new Error("expoPushToken is required.");

    const now = new Date().toISOString();

    // Because expo_push_token is globally unique, deactivate/reassign safely.
    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_type: normalizeDeviceType(deviceType),
          device_name: deviceName,
          device_id: deviceId,
          app_version: appVersion,
          build_number: buildNumber,
          os_version: osVersion,
          is_active: true,
          last_used_at: now,
          updated_at: now,
          disabled_at: null,
          last_error: null,
          failed_count: 0,
        },
        {
          onConflict: "expo_push_token",
        },
      )
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async getActiveTokensByUserIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];

    if (!ids.length) return [];

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select(
        `
        id,
        user_id,
        expo_push_token,
        device_type,
        device_name,
        device_id,
        app_version,
        build_number,
        os_version,
        notifications_received,
        failed_count,
        last_used_at
      `,
      )
      .in("user_id", ids)
      .eq("is_active", true);

    if (error) throw error;

    return data || [];
  },

  async getAllActiveTokens() {
    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select(
        `
      id,
      user_id,
      expo_push_token,
      device_type,
      device_name,
      device_id,
      app_version,
      build_number,
      os_version,
      notifications_received,
      failed_count,
      last_used_at
    `,
      )
      .eq("is_active", true);

    if (error) throw error;

    return data || [];
  },

  async incrementReceivedByTokenIds(tokenIds = []) {
    const ids = [...new Set(tokenIds.filter(Boolean))];

    if (!ids.length) return;

    const { data: tokens, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, notifications_received")
      .in("id", ids);

    if (error) throw error;
    if (!tokens?.length) return;

    const now = new Date().toISOString();

    const results = await Promise.all(
      tokens.map((token) =>
        supabaseAdmin
          .from("user_push_tokens")
          .update({
            notifications_received:
              Number(token.notifications_received || 0) + 1,
            last_used_at: now,
            updated_at: now,
          })
          .eq("id", token.id),
      ),
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) throw failed.error;
  },

  async incrementReceived(userId) {
    const tokens = await this.getActiveTokensByUserIds([userId]);
    await this.incrementReceivedByTokenIds(tokens.map((token) => token.id));
  },

  async markTokenFailure(expoPushToken, errorMessage) {
    if (!expoPushToken) return false;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, failed_count")
      .eq("expo_push_token", expoPushToken)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return false;

    const nextFailedCount = Number(existing.failed_count || 0) + 1;
    const shouldDisable = nextFailedCount >= 3;

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        failed_count: nextFailedCount,
        last_error: String(errorMessage || "Push delivery failed").slice(
          0,
          500,
        ),
        is_active: shouldDisable ? false : true,
        disabled_at: shouldDisable ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async deactivateToken(userId, expoPushToken) {
    if (!userId || !expoPushToken) return false;

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        is_active: false,
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("expo_push_token", expoPushToken)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async deactivateDevice(userId, deviceId) {
    if (!userId || !deviceId) return false;

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        is_active: false,
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .eq("is_active", true)
      .select("id");

    if (error) throw error;

    return Boolean(data?.length);
  },

  async deactivateAllForUser(userId) {
    if (!userId) return false;

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        is_active: false,
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_active", true)
      .select("id");

    if (error) throw error;

    return Boolean(data?.length);
  },
};

module.exports = PushTokenModel;
