const db = require("../config/db");

const USER_ROLE = 3;

const UserModel = {
  async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        is_verified,
        status,
        email_verified_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async findFullProfileById(userId) {
    const [rows] = await db.execute(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.rating,
        u.total_rides,
        u.is_verified,
        u.created_at,

        ud.address,
        ud.city,
        ud.state,
        ud.postal_code,
        ud.is_adhhar_verified,
        ud.profile_picture,
        ud.is_dl_verified,
        ud.is_verified
      FROM users u
      LEFT JOIN user_details ud
        ON ud.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId],
    );

    return rows[0] || null;
  },

  async emailOrPhoneExists(email, phone) {
    const [rows] = await db.execute(
      `
      SELECT id 
      FROM users 
      WHERE email = ? OR phone = ? 
      LIMIT 1
      `,
      [email, phone],
    );

    return rows.length > 0;
  },

  async createUser({ name, email, phone, password }) {
    const [result] = await db.execute(
      `
      INSERT INTO users
      (
        name,
        email,
        phone,
        password,
        role,
        is_verified,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, 'active', NOW(), NOW())
      `,
      [name, email, phone, password, USER_ROLE],
    );

    return this.findById(result.insertId);
  },
};

module.exports = UserModel;
