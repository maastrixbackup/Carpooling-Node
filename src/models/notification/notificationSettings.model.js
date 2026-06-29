const { supabaseAdmin } = require("../../config/supabase");

const DEFAULT_SETTINGS = {
  ride_alerts: true,
  booking_alerts: true,
  chat_alerts: true,
  safety_alerts: true,
  promotional_alerts: false,
  push_notifications: true,
  email_notifications: true,
};

const ALLOWED_FIELDS = Object.keys(DEFAULT_SETTINGS);

const NotificationSettingsModel = {
  async getOrCreate(userId) {
    if (!userId) throw new Error("userId is required.");

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return existing;

    const { data, error } = await supabaseAdmin
      .from("notification_settings")
      .insert({
        user_id: userId,
        ...DEFAULT_SETTINGS,
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async update(userId, payload = {}) {
    if (!userId) throw new Error("userId is required.");

    const updatePayload = {};

    for (const key of ALLOWED_FIELDS) {
      if (typeof payload[key] === "boolean") {
        updatePayload[key] = payload[key];
      }
    }

    if (!Object.keys(updatePayload).length) {
      return this.getOrCreate(userId);
    }

    const { data, error } = await supabaseAdmin
      .from("notification_settings")
      .upsert(
        {
          user_id: userId,
          ...updatePayload,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async isNotificationAllowed(userId, settingKey) {
    const settings = await this.getOrCreate(userId);

    if (settings.push_notifications === false) return false;
    if (!settingKey) return true;

    return settings[settingKey] !== false;
  },
};

module.exports = NotificationSettingsModel;