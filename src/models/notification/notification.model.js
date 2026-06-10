const db = require("../../config/db");

const NotificationModel = {
  async getActivePushTokensByUserIds(userIds) {
    if (!userIds.length) return [];

    const placeholders = userIds.map(() => "?").join(",");

    const [rows] = await db.execute(
      `
      SELECT 
        id,
        user_id,
        expo_push_token
      FROM user_push_tokens
      WHERE user_id IN (${placeholders})
        AND is_active = 1
      `,
      userIds
    );

    return rows;
  },

  async getAllActivePushTokens() {
    const [rows] = await db.execute(
      `
      SELECT 
        id,
        user_id,
        expo_push_token
      FROM user_push_tokens
      WHERE is_active = 1
      `
    );

    return rows;
  },

  async incrementReceivedByTokenIds(tokenIds) {
    if (!tokenIds.length) return;

    const placeholders = tokenIds.map(() => "?").join(",");

    await db.execute(
      `
      UPDATE user_push_tokens
      SET notifications_received = notifications_received + 1,
          updated_at = NOW()
      WHERE id IN (${placeholders})
      `,
      tokenIds
    );
  },

  async deactivateTokens(tokens) {
    if (!tokens.length) return;

    const placeholders = tokens.map(() => "?").join(",");

    await db.execute(
      `
      UPDATE user_push_tokens
      SET is_active = 0,
          updated_at = NOW()
      WHERE expo_push_token IN (${placeholders})
      `,
      tokens
    );
  },
};

module.exports = NotificationModel;