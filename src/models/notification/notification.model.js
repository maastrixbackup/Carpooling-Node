const { supabaseAdmin } = require("../../config/supabase");

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function normalizeLimit(limit) {
  const value = Number(limit || DEFAULT_PAGE_SIZE);

  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_SIZE;

  return Math.min(value, MAX_PAGE_SIZE);
}

function normalizeNotificationPayload({
  userId,
  title,
  message,
  type,
  referenceType = null,
  referenceId = null,
  data = null,
  priority = "normal",
  deliveryStatus = "pending",
  sentAt = null,
}) {
  if (!userId) throw new Error("Notification userId is required.");
  if (!title) throw new Error("Notification title is required.");
  if (!message) throw new Error("Notification message is required.");
  if (!type) throw new Error("Notification type is required.");

  return {
    user_id: userId,
    title: String(title).slice(0, 150),
    message,
    type,
    reference_type: referenceType,
    reference_id: referenceId,
    data,
    priority,
    delivery_status: deliveryStatus,
    sent_at: sentAt,
  };
}

const NotificationModel = {
  async createNotification(payload) {
    const row = normalizeNotificationPayload(payload);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async createBulkNotifications(notifications = []) {
    if (!Array.isArray(notifications) || notifications.length === 0) return [];

    const rows = notifications.map(normalizeNotificationPayload);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(rows)
      .select("*");

    if (error) throw error;

    return data || [];
  },

  async getUserNotifications(
    userId,
    { limit = DEFAULT_PAGE_SIZE, offset = 0 } = {},
  ) {
    if (!userId) throw new Error("userId is required.");

    const safeLimit = normalizeLimit(limit);
    const safeOffset = Math.max(Number(offset || 0), 0);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) throw error;

    return data || [];
  },

  async getUnreadCount(userId) {
    if (!userId) throw new Error("userId is required.");

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
    if (!notificationId) throw new Error("notificationId is required.");
    if (!userId) throw new Error("userId is required.");

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
    if (!userId) throw new Error("userId is required.");

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

  async updateDeliveryStatus(notificationIds = [], deliveryStatus = "sent") {
    const ids = [...new Set(notificationIds.filter(Boolean))];

    if (!ids.length) return false;

    const payload = {
      delivery_status: deliveryStatus,
      updated_at: new Date().toISOString(),
    };

    if (deliveryStatus === "sent") {
      payload.sent_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("notifications")
      .update(payload)
      .in("id", ids);

    if (error) throw error;

    return true;
  },

  async getUserNotifications(userId, { page = 1, limit = 5 } = {}) {
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data, error, count } = await supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      notifications: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      },
    };
  },

  async deleteNotification(notificationId, userId) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },
};

module.exports = NotificationModel;
