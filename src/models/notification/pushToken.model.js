const db = require("../../config/db");

const PushTokenModel = {
  async upsert({ userId, expoPushToken, deviceType, deviceName }) {
    const [result] = await db.execute(
      `
      INSERT INTO user_push_tokens
      (
        user_id,
        expo_push_token,
        device_type,
        device_name,
        is_active,
        last_used_at
      )
      VALUES (?, ?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        device_type = VALUES(device_type),
        device_name = VALUES(device_name),
        is_active = 1,
        last_used_at = NOW(),
        updated_at = NOW()
      `,
      [
        userId,
        expoPushToken,
        deviceType || "unknown",
        deviceName || null,
      ]
    );

    return result;
  },

  async incrementReceived(userId) {
    await db.execute(
      `
      UPDATE user_push_tokens
      SET notifications_received = notifications_received + 1,
          updated_at = NOW()
      WHERE user_id = ?
        AND is_active = 1
      `,
      [userId]
    );
  },

  async deactivateToken(userId, expoPushToken) {
    await db.execute(
      `
      UPDATE user_push_tokens
      SET is_active = 0,
          updated_at = NOW()
      WHERE user_id = ?
        AND expo_push_token = ?
      `,
      [userId, expoPushToken]
    );
  },
};

module.exports = PushTokenModel;