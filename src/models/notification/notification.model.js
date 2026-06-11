const { supabaseAdmin } = require("../../config/supabase");

const NotificationModel = {
  async getActivePushTokensByUserIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, user_id, expo_push_token")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (error) throw error;

    return data || [];
  },

  async getAllActivePushTokens() {
    const { data, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, user_id, expo_push_token")
      .eq("is_active", true);

    if (error) throw error;

    return data || [];
  },

  async incrementReceivedByTokenIds(tokenIds) {
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) return;

    const { data: tokens, error } = await supabaseAdmin
      .from("user_push_tokens")
      .select("id, notifications_received")
      .in("id", tokenIds);

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

  async deactivateTokens(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) return;

    const { error } = await supabaseAdmin
      .from("user_push_tokens")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("expo_push_token", tokens);

    if (error) throw error;
  },

  async createNotification({
    userId,
    title,
    message,
    type,
    referenceType = null,
    referenceId = null,
  }) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type,
        reference_type: referenceType,
        reference_id: referenceId,
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async createBulkNotifications(notifications = []) {
    if (!notifications.length) return [];

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select("*");

    if (error) throw error;

    return data || [];
  },

  async getUserNotifications(userId) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return count || 0;
  },

  async markAsRead(notificationId, userId) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async markAllAsRead(userId) {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return true;
  },
};

module.exports = NotificationModel;