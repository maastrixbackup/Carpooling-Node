const db = require("../config/db");

const RideModel = {
  async create({
    driverId,
    vehicleId,
    sourceAddress,
    sourcePlaceId,
    destinationAddress,
    destinationPlaceId,
    sourceLat,
    sourceLng,
    destinationLat,
    destinationLng,
    routePoints,
    rideDate,
    departureTime,
    polyline,
    distanceMeters,
    durationSeconds,
    estimatedReachTime,
    petAllowed,
    smokingAllowed,
    instantBooking,
    maxTwoInBack,
    pricePerSeat,
    totalSeats,
    availableSeats,
  }) {
    const [result] = await db.execute(
      `
      INSERT INTO rides
      (
        driver_id,
        vehicle_id,
        source_address,
        source_place_id,
        destination_address,
        destination_place_id,
        source_lat,
        source_lng,
        destination_lat,
        destination_lng,
        route_points,
        ride_date,
        departure_time,
        polyline,
        distance_meters,
        duration_seconds,
        estimated_reach_time,
        pet_allowed,
        smoking_allowed,
        instant_booking,
        max_two_in_back,
        price_per_seat,
        total_seats,
        available_seats,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())
      `,
      [
        driverId,
        vehicleId,
        sourceAddress,
        sourcePlaceId || null,
        destinationAddress,
        destinationPlaceId || null,
        sourceLat,
        sourceLng,
        destinationLat,
        destinationLng,
        routePoints ? JSON.stringify(routePoints) : null,
        rideDate,
        departureTime,
        polyline || null,
        distanceMeters || null,
        durationSeconds || null,
        estimatedReachTime || null,
        petAllowed || "no",
        smokingAllowed || "no",
        instantBooking || "yes",
        maxTwoInBack || "no",
        pricePerSeat,
        totalSeats,
        availableSeats || totalSeats,
      ],
    );

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `
      SELECT 
        r.*,
        u.name AS driver_name,
        u.phone AS driver_phone,
        u.rating AS driver_rating,
        u.total_rides AS driver_total_rides,
        v.brand,
        v.model,
        v.registration_number,
        v.color,
        v.rating AS vehicle_rating
      FROM rides r
      LEFT JOIN users u ON u.id = r.driver_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async findAll(filters = {}) {
    const values = [];
    let where = `
      WHERE r.status = 'scheduled'
        AND r.available_seats > 0
    `;

    if (filters.source) {
      where += ` AND r.source_address LIKE ?`;
      values.push(`%${filters.source}%`);
    }

    if (filters.destination) {
      where += ` AND r.destination_address LIKE ?`;
      values.push(`%${filters.destination}%`);
    }

    if (filters.rideDate) {
      where += ` AND r.ride_date = ?`;
      values.push(filters.rideDate);
    }

    if (filters.minSeats) {
      where += ` AND r.available_seats >= ?`;
      values.push(Number(filters.minSeats));
    }

    const [rows] = await db.execute(
      `
      SELECT 
        r.*,
        u.name AS driver_name,
        u.rating AS driver_rating,
        u.total_rides AS driver_total_rides,
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
      `,
      values,
    );

    return rows;
  },

  async findByDriver(driverId) {
    const [rows] = await db.execute(
      `
      SELECT 
        r.*,
        v.brand,
        v.model,
        v.registration_number,
        v.color
      FROM rides r
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.driver_id = ?
      ORDER BY r.ride_date DESC, r.departure_time DESC
      `,
      [driverId],
    );

    return rows;
  },

  async updateStatus(id, driverId, status) {
    const [result] = await db.execute(
      `
      UPDATE rides
      SET status = ?, updated_at = NOW()
      WHERE id = ?
        AND driver_id = ?
      `,
      [status, id, driverId],
    );

    return result.affectedRows > 0;
  },

  async findForBooking(id) {
    const [rows] = await db.execute(
      `
    SELECT *
    FROM rides
    WHERE id = ?
      AND status = 'scheduled'
    LIMIT 1
    `,
      [id],
    );

    return rows[0] || null;
  },

  async decreaseAvailableSeats(id, seats) {
    const [result] = await db.execute(
      `
    UPDATE rides
    SET 
      available_seats = available_seats - ?,
      updated_at = NOW()
    WHERE id = ?
      AND available_seats >= ?
      AND status = 'scheduled'
    `,
      [seats, id, seats],
    );

    return result.affectedRows > 0;
  },

  async increaseAvailableSeats(id, seats) {
    const [result] = await db.execute(
      `
    UPDATE rides
    SET 
      available_seats = available_seats + ?,
      updated_at = NOW()
    WHERE id = ?
    `,
      [seats, id],
    );

    return result.affectedRows > 0;
  },

  async findDriverRideById(rideId, driverId) {
    const [rows] = await db.execute(
      `
    SELECT 
      r.*,
      v.brand,
      v.model,
      v.registration_number,
      v.color
    FROM rides r
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    WHERE r.id = ?
      AND r.driver_id = ?
    LIMIT 1
    `,
      [rideId, driverId],
    );

    return rows[0] || null;
  },

  async findRideBookingsForDriver(rideId, driverId) {
    const [rows] = await db.execute(
      `
    SELECT 
      b.*,
      p.name AS passenger_name,
      p.phone AS passenger_phone
    FROM ride_bookings b
    LEFT JOIN rides r ON r.id = b.ride_id
    LEFT JOIN users p ON p.id = b.passenger_id
    WHERE b.ride_id = ?
      AND r.driver_id = ?
    ORDER BY b.created_at DESC
    `,
      [rideId, driverId],
    );

    return rows;
  },

  async updateDriverRide(rideId, driverId, payload) {
    const [result] = await db.execute(
      `
    UPDATE rides
    SET 
      price_per_seat = ?,
      available_seats = ?,
      pet_allowed = ?,
      smoking_allowed = ?,
      instant_booking = ?,
      max_two_in_back = ?,
      updated_at = NOW()
    WHERE id = ?
      AND driver_id = ?
      AND status != 'cancelled'
    `,
      [
        payload.price_per_seat,
        payload.available_seats,
        payload.pet_allowed,
        payload.smoking_allowed,
        payload.instant_booking,
        payload.max_two_in_back,
        rideId,
        driverId,
      ],
    );

    return result.affectedRows > 0;
  },

  async startRide(rideId, driverId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [rideRows] = await connection.execute(
        `
      SELECT id, driver_id, status
      FROM rides
      WHERE id = ?
      LIMIT 1
      `,
        [rideId],
      );

      const ride = rideRows[0];

      if (!ride) {
        await connection.rollback();
        return {
          success: false,
          reason: "ride_not_found",
        };
      }

      if (Number(ride.driver_id) !== Number(driverId)) {
        await connection.rollback();
        return {
          success: false,
          reason: "not_ride_owner",
        };
      }

      if (ride.status !== "scheduled") {
        await connection.rollback();
        return {
          success: false,
          reason: `invalid_status_${ride.status}`,
        };
      }

      await connection.execute(
        `
      UPDATE rides
      SET status = 'ongoing',
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
        AND driver_id = ?
        AND status = 'scheduled'
      `,
        [rideId, driverId],
      );

      await connection.execute(
        `
      UPDATE ride_bookings
      SET status = 'ongoing',
          updated_at = NOW()
      WHERE ride_id = ?
        AND status = 'accepted'
      `,
        [rideId],
      );

      await connection.commit();

      return {
        success: true,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async completeRide(rideId, driverId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [rideRows] = await connection.execute(
        `
      SELECT id, driver_id, status
      FROM rides
      WHERE id = ?
      LIMIT 1
      `,
        [rideId],
      );
      const ride = rideRows[0];
      if (!ride) {
        await connection.rollback();
        return { success: false, reason: "ride_not_found" };
      }

      if (Number(ride.driver_id) !== Number(driverId)) {
        await connection.rollback();
        return { success: false, reason: "not_ride_owner" };
      }

      if (ride.status !== "ongoing") {
        await connection.rollback();
        return {
          success: false,
          reason: `invalid_status_${ride.status}`,
        };
      }

      await connection.execute(
        `
      UPDATE rides
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
        AND driver_id = ?
        AND status = 'ongoing'
      `,
        [rideId, driverId],
      );

      await connection.execute(
        `
      UPDATE ride_bookings
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE ride_id = ?
        AND status = 'ongoing'
      `,
        [rideId],
      );

      await connection.commit();

      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = RideModel;
