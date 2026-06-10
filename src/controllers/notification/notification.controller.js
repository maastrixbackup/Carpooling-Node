const NotificationService = require("../../services/notification.service");

const broadcastNotification = async (req, res) => {
  try {
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
      message: "Broadcast notification sent.",
      data: result,
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending broadcast notification.",
    });
  }
};

const sendNotificationToUsers = async (req, res) => {
  try {
    const { user_ids, title, body, data } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "User IDs, title and body are required.",
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
      message: "Notification sent.",
      data: result,
    });
  } catch (error) {
    console.error("Send notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending notification.",
    });
  }
};

module.exports = {
  broadcastNotification,
  sendNotificationToUsers,
};