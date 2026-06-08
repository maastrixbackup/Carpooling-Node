const db = require("../config/db");

const VehicleModel = {
  async create({
    userId,
    vehicleType,
    brand,
    model,
    manufactureYear,
    registrationNumber,
    rcNumber,
    color,
    seats,
    availableSeats,
    fuelType,
  }) {
    const [result] = await db.execute(
      `
      INSERT INTO vehicles
      (
        user_id,
        vehicle_type,
        brand,
        model,
        manufacture_year,
        registration_number,
        rc_number,
        color,
        seats,
        available_seats,
        fuel_type,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `,
      [
        userId,
        vehicleType,
        brand,
        model,
        manufactureYear || null,
        registrationNumber,
        rcNumber || null,
        color || null,
        seats,
        availableSeats,
        fuelType || null,
      ]
    );

    return this.findById(result.insertId, userId);
  },

  async findAllByUser(userId) {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM vehicles
      WHERE user_id = ?
        AND status != 'blocked'
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return rows;
  },

  async findById(id, userId) {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM vehicles
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [id, userId]
    );

    return rows[0] || null;
  },

  async findByRegistrationNumber(registrationNumber) {
    const [rows] = await db.execute(
      `
      SELECT id
      FROM vehicles
      WHERE registration_number = ?
      LIMIT 1
      `,
      [registrationNumber]
    );

    return rows[0] || null;
  },

  async update(id, userId, payload) {
    const [result] = await db.execute(
      `
      UPDATE vehicles
      SET
        vehicle_type = ?,
        brand = ?,
        model = ?,
        manufacture_year = ?,
        registration_number = ?,
        rc_number = ?,
        color = ?,
        seats = ?,
        available_seats = ?,
        fuel_type = ?,
        updated_at = NOW()
      WHERE id = ?
        AND user_id = ?
      `,
      [
        payload.vehicleType,
        payload.brand,
        payload.model,
        payload.manufactureYear || null,
        payload.registrationNumber,
        payload.rcNumber || null,
        payload.color || null,
        payload.seats,
        payload.availableSeats,
        payload.fuelType || null,
        id,
        userId,
      ]
    );

    if (result.affectedRows === 0) return null;

    return this.findById(id, userId);
  },

  async delete(id, userId) {
    const [result] = await db.execute(
      `
    DELETE FROM vehicles
    WHERE id = ?
      AND user_id = ?
    `,
      [id, userId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = VehicleModel;