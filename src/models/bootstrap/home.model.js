const db = require("../../config/db");

const HomeModel = {
  async getUserStats(userId) {
    const [[bookingStats]] = await db.execute(
      `
      SELECT 
        COUNT(*) AS total_trips,
        COALESCE(SUM(total_price), 0) AS total_spent
      FROM ride_bookings
      WHERE passenger_id = ?
        AND status IN ('accepted', 'completed', 'pending')
      `,
      [userId]
    );

    const [[publishedStats]] = await db.execute(
      `
      SELECT COUNT(*) AS published_rides
      FROM rides
      WHERE driver_id = ?
      `,
      [userId]
    );

    return {
      total_trips: bookingStats.total_trips || 0,
      total_spent: Number(bookingStats.total_spent || 0),
      published_rides: publishedStats.published_rides || 0,
      co2_saved_kg: Math.round((bookingStats.total_trips || 0) * 1.8),
    };
  },

  async getUpcomingBooking(userId) {
    const [rows] = await db.execute(
      `
      SELECT 
        b.*,
        u.name AS driver_name,
        v.brand,
        v.model,
        v.registration_number,
        v.color
      FROM ride_bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      LEFT JOIN users u ON u.id = r.driver_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE b.passenger_id = ?
        AND b.status IN ('pending', 'accepted')
        AND b.ride_date >= CURDATE()
      ORDER BY b.ride_date ASC, b.ride_time ASC
      LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  },

  async getPopularRoutes() {
    const [rows] = await db.execute(
      `
      SELECT 
        source_address,
        destination_address,
        COUNT(*) AS ride_count,
        MIN(price_per_seat) AS starting_price
      FROM rides
      WHERE status = 'scheduled'
        AND ride_date >= CURDATE()
      GROUP BY source_address, destination_address
      ORDER BY ride_count DESC
      LIMIT 8
      `
    );

    return rows;
  },

  async getAvailableRides({ source, destination, rideDate, seats }) {
    const values = [];
    let where = `
      WHERE r.status = 'scheduled'
        AND r.ride_date >= CURDATE()
        AND r.available_seats > 0
    `;

    if (source) {
      where += ` AND r.source_address LIKE ?`;
      values.push(`%${source}%`);
    }

    if (destination) {
      where += ` AND r.destination_address LIKE ?`;
      values.push(`%${destination}%`);
    }

    if (rideDate) {
      where += ` AND r.ride_date = ?`;
      values.push(rideDate);
    }

    if (seats) {
      where += ` AND r.available_seats >= ?`;
      values.push(Number(seats));
    }

    const [rows] = await db.execute(
      `
      SELECT 
        r.*,
        u.name AS driver_name,
        v.brand,
        v.model,
        v.registration_number,
        v.color,
        v.rating AS vehicle_rating
      FROM rides r
      LEFT JOIN users u ON u.id = r.driver_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      ${where}
      ORDER BY r.ride_date ASC, r.departure_time ASC
      LIMIT 10
      `,
      values
    );

    return rows;
  },
};

module.exports = HomeModel;