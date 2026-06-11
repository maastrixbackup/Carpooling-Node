const NotificationService = require("../../services/notification.service");
const NotificationModel = require("../../models/notification/notification.model");

const isAdminUser = (req) => {
  const role =
    req.user?.appMetadata?.role ||
    req.user?.metadata?.role ||
    req.user?.role;

  return role === "admin";
};

const broadcastNotification = async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Title and body are required.",
      });
    }

    const result = await NotificationService.broadcastPush({
      title,
      body,
      data: data || {},
    });

    return res.status(200).json({
      success: true,
      message: "Broadcast notification sent successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[ERROR] Broadcast notification:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending broadcast notification.",
    });
  }
};

const sendNotificationToUsers = async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const { user_ids, title, body, data } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "User IDs, title, and body are required.",
      });
    }

    const result = await NotificationService.sendPushToUsers({
      userIds: user_ids,
      title,
      body,
      data: data || {},
    });

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[ERROR] Send notification:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending notification.",
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.getUserNotifications(
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data: { notifications },
    });
  } catch (error) {
    console.error("[ERROR] Get notifications:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching notifications.",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unread_count = await NotificationModel.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Unread notification count fetched successfully.",
      data: { unread_count },
    });
  } catch (error) {
    console.error("[ERROR] Get unread count:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching unread count.",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const updated = await NotificationModel.markAsRead(
      req.params.id,
      req.user.id,
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("[ERROR] Mark notification read:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating notification.",
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await NotificationModel.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("[ERROR] Mark all notifications read:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating notifications.",
    });
  }
};

module.exports = {
  broadcastNotification,
  sendNotificationToUsers,
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};