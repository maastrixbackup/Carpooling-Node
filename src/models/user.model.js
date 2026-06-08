const db = require("../config/db");

const USER_ROLE = 3;

const UserModel = {
    async findByEmail(email) {
        const [rows] = await db.execute(
            `SELECT * FROM users WHERE email = ? LIMIT 1`,
            [email]
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
            [id]
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
            [email, phone]
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
            [name, email, phone, password, USER_ROLE]
        );

        return this.findById(result.insertId);
    },
};

module.exports = UserModel;