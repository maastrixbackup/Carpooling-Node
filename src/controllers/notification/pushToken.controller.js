const PushTokenModel = require("../../models/notification/pushToken.model");

const VALID_DEVICE_TYPES = ["ios", "android", "web", "unknown"];

const isValidExpoToken = (token) => {
  return (
    typeof token === "string" &&
    (
      token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken[")
    ) &&
    token.endsWith("]")
  );
};

const normalizeDeviceType = (deviceType) => {
  const value = String(deviceType || "unknown").toLowerCase();
  return VALID_DEVICE_TYPES.includes(value) ? value : "unknown";
};

const savePushToken = async (req, res) => {
  try {
    const {
      expo_push_token,
      device_type,
      device_name,
      device_id,
      app_version,
      build_number,
      os_version,
    } = req.body || {};

    if (!expo_push_token) {
      return res.status(400).json({
        success: false,
        message: "Expo push token is required.",
      });
    }

    if (!isValidExpoToken(expo_push_token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expo push token.",
      });
    }

    const token = await PushTokenModel.upsert({
      userId: req.user.id,
      expoPushToken: expo_push_token,
      deviceType: normalizeDeviceType(device_type),
      deviceName: device_name || null,
      deviceId: device_id || null,
      appVersion: app_version || null,
      buildNumber: build_number || null,
      osVersion: os_version || null,
    });

    return res.status(200).json({
      success: true,
      message: "Push token saved successfully.",
      data: {
        token: {
          id: token.id,
          device_type: token.device_type,
          device_name: token.device_name,
          device_id: token.device_id,
          app_version: token.app_version,
          build_number: token.build_number,
          os_version: token.os_version,
          is_active: token.is_active,
          last_used_at: token.last_used_at,
        },
      },
    });
  } catch (error) {
    console.error("[ERROR] Save push token:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving push token.",
    });
  }
};

const deactivatePushToken = async (req, res) => {
  try {
    const { expo_push_token, device_id } = req.body || {};

    if (!expo_push_token && !device_id) {
      return res.status(400).json({
        success: false,
        message: "Expo push token or device id is required.",
      });
    }

    let deactivated = false;

    if (expo_push_token) {
      deactivated = await PushTokenModel.deactivateToken(
        req.user.id,
        expo_push_token,
      );
    } else if (device_id) {
      deactivated = await PushTokenModel.deactivateDevice(
        req.user.id,
        device_id,
      );
    }

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
    console.error("[ERROR] Deactivate push token:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

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