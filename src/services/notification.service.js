const { Expo } = require("expo-server-sdk");
const NotificationModel = require("../models/notification/notification.model");

const expo = new Expo();

const sendPushToTokens = async ({ tokens, title, body, data = {} }) => {
  const validRows = [];
  const invalidTokens = [];

  for (const row of tokens) {
    if (Expo.isExpoPushToken(row.expo_push_token)) {
      validRows.push(row);
    } else {
      invalidTokens.push(row.expo_push_token);
    }
  }

  if (invalidTokens.length) {
    await NotificationModel.deactivateTokens(invalidTokens);
  }

  const messages = validRows.map((row) => ({
    to: row.expo_push_token,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Expo push send chunk error:", error);
    }
  }

  const successfulTokenIds = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === "ok" && validRows[index]) {
      successfulTokenIds.push(validRows[index].id);
    }

    if (ticket.status === "error") {
      console.error("Expo push ticket error:", ticket);
    }
  });

  await NotificationModel.incrementReceivedByTokenIds(successfulTokenIds);

  return {
    requested: tokens.length,
    valid: validRows.length,
    sent: successfulTokenIds.length,
    invalid: invalidTokens.length,
    tickets,
  };
};

const sendPushToUsers = async ({ userIds, title, body, data = {} }) => {
  const tokens = await NotificationModel.getActivePushTokensByUserIds(userIds);

  return sendPushToTokens({
    tokens,
    title,
    body,
    data,
  });
};

const broadcastPush = async ({ title, body, data = {} }) => {
  const tokens = await NotificationModel.getAllActivePushTokens();
  // console.log("TOKENS => ", tokens);
  return sendPushToTokens({
    tokens,
    title,
    body,
    data,
  });
};

module.exports = {
  sendPushToTokens,
  sendPushToUsers,
  broadcastPush,
};
