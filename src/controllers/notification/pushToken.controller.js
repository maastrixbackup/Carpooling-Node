const PushTokenModel = require("../../models/notification/pushToken.model");

const isValidExpoToken = (token) => {
  return (
    typeof token === "string" &&
    token.startsWith("ExponentPushToken[") &&
    token.endsWith("]")
  );
};

const savePushToken = async (req, res) => {
  try {
    const { expo_push_token, device_type, device_name } = req.body;

    if (!expo_push_token) {
      return res.status(400).json({
        success: false,
        message: "Expo push token is required.",
      });
    }

    if (process.env.NODE_ENV === "production" && !isValidExpoToken(expo_push_token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expo push token.",
      });
    }

    const token = await PushTokenModel.upsert({
      userId: req.user.id,
      expoPushToken: expo_push_token,
      deviceType: device_type,
      deviceName: device_name,
    });

    return res.status(200).json({
      success: true,
      message: "Push token saved successfully.",
      data: { token },
    });
  } catch (error) {
    console.error("[ERROR] Save push token:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving push token.",
    });
  }
};

const deactivatePushToken = async (req, res) => {
  try {
    const { expo_push_token } = req.body;

    if (!expo_push_token) {
      return res.status(400).json({
        success: false,
        message: "Expo push token is required.",
      });
    }

    const deactivated = await PushTokenModel.deactivateToken(
      req.user.id,
      expo_push_token,
    );

    if (!deactivated) {
      return res.status(404).json({
        success: false,
        message: "Push token not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Push token deactivated successfully.",
    });
  } catch (error) {
    console.error("[ERROR] Deactivate push token:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deactivating push token.",
    });
  }
};

module.exports = {
  savePushToken,
  deactivatePushToken,
};