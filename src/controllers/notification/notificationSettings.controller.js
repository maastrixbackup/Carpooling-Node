const NotificationSettingsModel = require("../../models/notification/notificationSettings.model");

const getMyNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSettingsModel.getOrCreate(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notification settings fetched successfully.",
      data: { settings },
    });
  } catch (error) {
    console.error("[ERROR] Get notification settings:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching notification settings.",
    });
  }
};

const updateMyNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSettingsModel.update(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Notification settings updated successfully.",
      data: { settings },
    });
  } catch (error) {
    console.error("[ERROR] Update notification settings:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating notification settings.",
    });
  }
};

module.exports = {
  getMyNotificationSettings,
  updateMyNotificationSettings,
};