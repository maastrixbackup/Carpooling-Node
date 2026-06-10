const PushTokenModel = require("../../models/notification/pushToken.model");

const savePushToken = async (req, res) => {
  try {
    const { expo_push_token, device_type, device_name } = req.body;

    if (!expo_push_token) {
      return res.status(400).json({
        success: false,
        message: "Expo push token is required.",
      });
    }

    if (
      process.env.NODE_ENV === "production" &&
      !expo_push_token.startsWith("ExponentPushToken[")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expo push token.",
      });
    }

    await PushTokenModel.upsert({
      userId: req.user.id,
      expoPushToken: expo_push_token,
      deviceType: device_type,
      deviceName: device_name,
    });

    return res.status(200).json({
      success: true,
      message: "Push token saved successfully.",
    });
  } catch (error) {
    console.error("Save push token error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving push token.",
    });
  }
};

module.exports = {
  savePushToken,
};
