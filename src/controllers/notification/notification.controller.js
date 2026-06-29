const NotificationService = require("../../services/notification.service");
const NotificationModel = require("../../models/notification/notification.model");

const isAdminUser = (req) => {
  const role =
    req.user?.appMetadata?.role ||
    req.user?.metadata?.role ||
    req.user?.role;

  return role === "admin";
};

const logControllerError = (label, error) => {
  console.error(`[ERROR] ${label}:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    stack: error?.stack,
  });
};

const broadcastNotification = async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const {
      title,
      body,
      type = "broadcast",
      data = {},
      priority = "normal",
    } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Title and body are required.",
      });
    }

    const result = await NotificationService.broadcast({
      title,
      body,
      type,
      data,
      priority,
    });

    return res.status(200).json({
      success: true,
      message: "Broadcast notification sent successfully.",
      data: result,
    });
  } catch (error) {
    logControllerError("Broadcast notification", error);

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

    const {
      user_ids,
      title,
      body,
      type = "manual",
      reference_type = null,
      reference_id = null,
      data = {},
      priority = "normal",
    } = req.body || {};

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "User IDs, title, and body are required.",
      });
    }

    const result = await NotificationService.notifyUsers({
      userIds: user_ids,
      title,
      body,
      type,
      referenceType: reference_type,
      referenceId: reference_id,
      data,
      priority,
      saveHistory: true,
    });

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
      data: result,
    });
  } catch (error) {
    logControllerError("Send notification", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending notification.",
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const result = await NotificationModel.getUserNotifications(req.user.id, {
      page: req.query.page || 1,
      limit: req.query.limit || 5,
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[ERROR] Get notifications:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching notifications.",
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const deleted = await NotificationModel.deleteNotification(
      req.params.id,
      req.user.id,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("[ERROR] Delete notification:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting notification.",
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
    logControllerError("Get unread count", error);

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
    logControllerError("Mark notification read", error);

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
    logControllerError("Mark all notifications read", error);

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
  deleteNotification
};