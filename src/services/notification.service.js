const { Expo } = require("expo-server-sdk");
const NotificationModel = require("../models/notification/notification.model");
const PushTokenModel = require("../models/notification/pushToken.model");
const NotificationSettingsModel = require("../models/notification/notificationSettings.model");

const getSettingKeyByType = (type = "") => {
  const value = String(type).toLowerCase();
  if (value.includes("booking")) return "booking_alerts";
  if (value.includes("ride")) return "ride_alerts";
  if (value.includes("message") || value.includes("chat")) return "chat_alerts";
  if (value.includes("safety") || value.includes("verification"))
    return "safety_alerts";
  if (
    value.includes("promo") ||
    value.includes("offer") ||
    value.includes("broadcast")
  ) {
    return "promotional_alerts";
  }

  return null;
};

const expo = new Expo();

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function normalizeExpoData(data = {}) {
  const normalized = {};

  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    normalized[key] =
      typeof value === "object" ? JSON.stringify(value) : String(value);
  });

  return normalized;
}

async function filterUsersByNotificationSettings(userIds = [], type) {
  const ids = uniqueIds(userIds);
  const settingKey = getSettingKeyByType(type);

  const allowedUserIds = [];

  for (const userId of ids) {
    const allowed = await NotificationSettingsModel.isNotificationAllowed(
      userId,
      settingKey,
    );

    if (allowed) {
      allowedUserIds.push(userId);
    }
  }

  return allowedUserIds;
}

async function sendPushToTokens({
  tokens = [],
  title,
  body,
  data = {},
  priority = "high",
}) {
  const validRows = [];
  const invalidTokens = [];

  for (const row of tokens) {
    if (Expo.isExpoPushToken(row.expo_push_token)) {
      validRows.push(row);
    } else {
      invalidTokens.push(row.expo_push_token);
    }
  }

  for (const invalidToken of invalidTokens) {
    await PushTokenModel.markTokenFailure(
      invalidToken,
      "Invalid Expo push token",
    );
  }

  const messages = validRows.map((row) => ({
    to: row.expo_push_token,
    sound: "default",
    title,
    body,
    data: normalizeExpoData(data),
    priority,
    channelId: "default",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  const successfulTokenIds = [];

  let ticketIndex = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      for (const ticket of ticketChunk) {
        const tokenRow = validRows[ticketIndex];

        tickets.push(ticket);

        if (ticket.status === "ok") {
          successfulTokenIds.push(tokenRow.id);
        }

        if (ticket.status === "error") {
          await PushTokenModel.markTokenFailure(
            tokenRow.expo_push_token,
            ticket?.details?.error ||
              ticket?.message ||
              "Expo push ticket error",
          );
        }

        ticketIndex += 1;
      }
    } catch (error) {
      console.error("[PUSH CHUNK ERROR]", {
        message: error?.message,
        stack: error?.stack,
      });

      for (let i = 0; i < chunk.length; i += 1) {
        const tokenRow = validRows[ticketIndex];

        if (tokenRow) {
          await PushTokenModel.markTokenFailure(
            tokenRow.expo_push_token,
            error?.message || "Expo push chunk failed",
          );
        }

        ticketIndex += 1;
      }
    }
  }

  await PushTokenModel.incrementReceivedByTokenIds(successfulTokenIds);

  return {
    requested: tokens.length,
    valid: validRows.length,
    sent: successfulTokenIds.length,
    invalid: invalidTokens.length,
    failed: validRows.length - successfulTokenIds.length,
    tickets,
  };
}

async function notifyUsers({
  userIds = [],
  title,
  body,
  type,
  referenceType = null,
  referenceId = null,
  data = {},
  priority = "normal",
  saveHistory = true,
}) {
  const ids = uniqueIds(userIds);
  const allowedUserIds = await filterUsersByNotificationSettings(ids, type);

  if (!ids.length) {
    return {
      users: 0,
      notifications: 0,
      push: null,
    };
  }

  if (!allowedUserIds.length) {
    return {
      users: ids.length,
      allowedUsers: 0,
      notifications: 0,
      push: null,
      skipped: ids.length,
      reason: "notification_settings_disabled",
    };
  }

  if (!title || !body || !type) {
    throw new Error("title, body, and type are required.");
  }

  let notificationRows = [];

  if (saveHistory) {
    notificationRows = await NotificationModel.createBulkNotifications(
      allowedUserIds.map((userId) => ({
        userId,
        title,
        message: body,
        type,
        referenceType,
        referenceId,
        data,
        priority,
        deliveryStatus: "pending",
      })),
    );
  }

  const tokens = await PushTokenModel.getActiveTokensByUserIds(allowedUserIds);

  const pushResult = await sendPushToTokens({
    tokens,
    title,
    body,
    data: {
      ...data,
      type,
      referenceType,
      referenceId,
    },
    priority: priority === "urgent" ? "high" : "high",
  });

  if (saveHistory && notificationRows.length) {
    await NotificationModel.updateDeliveryStatus(
      notificationRows.map((item) => item.id),
      pushResult.sent > 0 ? "sent" : "failed",
    );
  }

  return {
    users: ids.length,
    allowedUsers: allowedUserIds.length,
    notifications: notificationRows.length,
    push: pushResult,
  };
}

async function broadcast({
  title,
  body,
  type = "broadcast",
  data = {},
  priority = "normal",
}) {
  if (!title || !body) {
    throw new Error("title and body are required.");
  }

  const tokens = await PushTokenModel.getAllActiveTokens();

  const userIds = uniqueIds(tokens.map((token) => token.user_id));
  const allowedUserIds = await filterUsersByNotificationSettings(userIds, type);
  const allowedUserIdSet = new Set(allowedUserIds);
  const allowedTokens = tokens.filter((token) =>
    allowedUserIdSet.has(String(token.user_id)),
  );

  let notificationRows = [];

  if (userIds.length) {
    notificationRows = await NotificationModel.createBulkNotifications(
      allowedUserIds.map((userId) => ({
        userId,
        title,
        message: body,
        type,
        data,
        priority,
        deliveryStatus: "pending",
      })),
    );
  }

  const pushResult = await sendPushToTokens({
    allowedTokens,
    title,
    body,
    data: {
      ...data,
      type,
    },
    priority: priority === "urgent" ? "high" : "high",
  });

  if (notificationRows.length) {
    await NotificationModel.updateDeliveryStatus(
      notificationRows.map((item) => item.id),
      pushResult.sent > 0 ? "sent" : "failed",
    );
  }

  return {
    users: userIds.length,
    allowedUsers: allowedUserIds.length,
    notifications: notificationRows.length,
    push: pushResult,
  };
}

// Backward-compatible wrappers, so old controllers won't break immediately.
async function sendPushToUsers({ userIds, title, body, data = {} }) {
  return notifyUsers({
    userIds,
    title,
    body,
    type: data?.type || "manual",
    referenceType: data?.referenceType || data?.reference_type || null,
    referenceId: data?.referenceId || data?.reference_id || null,
    data,
    saveHistory: true,
  });
}

async function broadcastPush({ title, body, data = {} }) {
  return broadcast({
    title,
    body,
    type: data?.type || "broadcast",
    data,
  });
}

module.exports = {
  sendPushToTokens,
  notifyUsers,
  broadcast,
  sendPushToUsers,
  broadcastPush,
};
