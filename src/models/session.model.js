const db = require("../config/db");

const SessionModel = {
  async createSession({
    userId,
    accessTokenHash,
    refreshTokenHash,
    deviceName,
    platform,
    ipAddress,
    userAgent,
    expiresAt,
  }) {
    const [result] = await db.execute(
      `
      INSERT INTO user_sessions
      (
        user_id,
        access_token_hash,
        refresh_token_hash,
        device_name,
        platform,
        ip_address,
        user_agent,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        userId,
        accessTokenHash,
        refreshTokenHash,
        deviceName || null,
        platform || null,
        ipAddress || null,
        userAgent || null,
        expiresAt,
      ]
    );

    return result.insertId;
  },

  async findActiveByRefreshTokenHash(refreshTokenHash) {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM user_sessions
      WHERE refresh_token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      `,
      [refreshTokenHash]
    );

    return rows[0] || null;
  },

  async rotateRefreshToken({ sessionId, accessTokenHash, refreshTokenHash, expiresAt }) {
    await db.execute(
      `
      UPDATE user_sessions
      SET 
        access_token_hash = ?,
        refresh_token_hash = ?,
        expires_at = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [accessTokenHash, refreshTokenHash, expiresAt, sessionId]
    );
  },

  async revokeSession(sessionId) {
    await db.execute(
      `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE id = ?
      `,
      [sessionId]
    );
  },

  async revokeAllUserSessions(userId) {
    await db.execute(
      `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE user_id = ?
        AND revoked_at IS NULL
      `,
      [userId]
    );
  },
};

module.exports = SessionModel;