const db = require("../config/db");

class ReviewModel {
  async create({ rideId, bookingId, reviewerId, driverId, rating, review }) {
    const [result] = await db.execute(
      `
      INSERT INTO ride_reviews
      (
        ride_id,
        booking_id,
        reviewer_id,
        driver_id,
        rating,
        review
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [rideId, bookingId, reviewerId, driverId, rating, review || null],
    );

    return this.findById(result.insertId);
  }

  async findById(id) {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM ride_reviews
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  async findByBooking(bookingId) {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM ride_reviews
      WHERE booking_id = ?
      LIMIT 1
      `,
      [bookingId],
    );

    return rows[0] || null;
  }

  async findByDriver(driverId) {
    const [rows] = await db.execute(
      `
      SELECT
        r.*,
        u.name AS reviewer_name
      FROM ride_reviews r
      LEFT JOIN users u
        ON u.id = r.reviewer_id
      WHERE r.driver_id = ?
      ORDER BY r.created_at DESC
      `,
      [driverId],
    );

    return rows;
  }

  async getDriverStats(driverId) {
    const [rows] = await db.execute(
      `
      SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating), 1) AS average_rating
      FROM ride_reviews
      WHERE driver_id = ?
      `,
      [driverId],
    );

    return rows[0];
  }

  async hasReviewed(bookingId) {
    const [rows] = await db.execute(
      `
    SELECT id
    FROM ride_reviews
    WHERE booking_id = ?
    LIMIT 1
    `,
      [bookingId],
    );

    return rows.length > 0;
  }
}

module.exports = new ReviewModel();
