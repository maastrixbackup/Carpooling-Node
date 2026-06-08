const db = require("../config/db");

const BookingModel = {
  async createBooking({
    bookingCode,
    rideId,
    passengerId,
    seats,
    rideSource,
    rideDestination,
    rideSourceLat,
    rideSourceLng,
    rideDestinationLat,
    rideDestinationLng,
    rideDate,
    rideTime,
    pricePerSeat,
    totalPrice,
  }) {
    const [result] = await db.execute(
      `
      INSERT INTO ride_bookings
      (
        booking_code,
        ride_id,
        passenger_id,
        seats,
        ride_source,
        ride_destination,
        ride_source_lat,
        ride_source_lng,
        ride_destination_lat,
        ride_destination_lng,
        ride_date,
        ride_time,
        price_per_seat,
        total_price,
        status,
        payment_status,
        payment_type,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', 'cash', NOW(), NOW())
      `,
      [
        bookingCode,
        rideId,
        passengerId,
        seats,
        rideSource,
        rideDestination,
        rideSourceLat,
        rideSourceLng,
        rideDestinationLat,
        rideDestinationLng,
        rideDate,
        rideTime,
        pricePerSeat,
        totalPrice,
      ]
    );

    return this.findById(result.insertId, passengerId);
  },

  async findById(id, userId) {
    const [rows] = await db.execute(
      `
      SELECT 
        b.*,
        r.driver_id,
        u.name AS driver_name,
        u.phone AS driver_phone,
        v.brand,
        v.model,
        v.registration_number,
        v.color
      FROM ride_bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      LEFT JOIN users u ON u.id = r.driver_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE b.id = ?
        AND (b.passenger_id = ? OR r.driver_id = ?)
      LIMIT 1
      `,
      [id, userId, userId]
    );

    return rows[0] || null;
  },

  async findByPassenger(passengerId) {
    const [rows] = await db.execute(
      `
      SELECT 
        b.*,
        r.driver_id,
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
      ORDER BY b.created_at DESC
      `,
      [passengerId]
    );

    return rows;
  },

  async findByDriver(driverId) {
    const [rows] = await db.execute(
      `
      SELECT 
        b.*,
        p.name AS passenger_name,
        p.phone AS passenger_phone,
        r.driver_id
      FROM ride_bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      LEFT JOIN users p ON p.id = b.passenger_id
      WHERE r.driver_id = ?
      ORDER BY b.created_at DESC
      `,
      [driverId]
    );

    return rows;
  },

  async updateStatus(id, userId, status) {
    const [result] = await db.execute(
      `
      UPDATE ride_bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      SET 
        b.status = ?,
        b.accepted_at = CASE WHEN ? = 'accepted' THEN NOW() ELSE b.accepted_at END,
        b.confirmed_at = CASE WHEN ? = 'accepted' THEN NOW() ELSE b.confirmed_at END,
        b.cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE b.cancelled_at END,
        b.updated_at = NOW()
      WHERE b.id = ?
        AND (b.passenger_id = ? OR r.driver_id = ?)
      `,
      [status, status, status, status, id, userId, userId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = BookingModel;