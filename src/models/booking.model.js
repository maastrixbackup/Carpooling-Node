const BookingModel = {
  async createBooking(supabase, payload) {
    const { data, error } = await supabase
      .from("ride_bookings")
      .insert({
        booking_code: payload.bookingCode,
        ride_id: payload.rideId,
        passenger_id: payload.passengerId,
        seats: payload.seats,
        ride_source: payload.rideSource,
        ride_destination: payload.rideDestination,
        ride_source_lat: payload.rideSourceLat || null,
        ride_source_lng: payload.rideSourceLng || null,
        ride_destination_lat: payload.rideDestinationLat || null,
        ride_destination_lng: payload.rideDestinationLng || null,
        ride_date: payload.rideDate || null,
        ride_time: payload.rideTime || null,
        price_per_seat: payload.pricePerSeat,
        total_price: payload.totalPrice,
        status: "pending",
        payment_status: "unpaid",
        payment_type: "cash",
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async findActiveBookingByPassengerAndRide(supabase, passengerId, rideId) {
    const { data, error } = await supabase
      .from("ride_bookings")
      .select("id, status")
      .eq("passenger_id", passengerId)
      .eq("ride_id", rideId)
      .not("status", "in", '("cancelled","rejected")')
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findById(supabase, id, userId) {
    const { data, error } = await supabase
      .from("ride_bookings")
      .select(
        `
      id,
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
      rides!inner (
        id,
        driver_id,
        vehicle_id,
        source_address,
        destination_address,
        source_lat,
        source_lng,
        destination_lat,
        destination_lng,
        ride_date,
        departure_time,
        user_details!rides_driver_details_fkey (
          full_name,
          phone
        ),
        vehicles (
          brand,
          model,
          registration_number,
          color
        )
      )
    `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const isPassenger = String(data.passenger_id) === String(userId);
    const isDriver = String(data.rides?.driver_id) === String(userId);

    if (!isPassenger && !isDriver) return null;

    return data;
  },

  async findByPassenger(supabase, passengerId) {
    const { data, error } = await supabase
      .from("ride_bookings")
      .select(
        `
      id,
      booking_code,
      seats,
      ride_source,
      ride_destination,
      ride_date,
      ride_time,
      total_price,
      payment_status,
      status,
      created_at,
      rides (
        id,
        driver_id,
        source_address,
        destination_address,
        user_details!rides_driver_details_fkey (
          full_name,
          rating,
          total_rides
        ),
        vehicles (
          brand,
          model,
          registration_number,
          color
        )
      )
    `,
      )
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async findByDriver(supabase, { driverId, rideId }) {
    let query = supabase
      .from("ride_bookings")
      .select(
        `
        *,
        rides!inner (
          id,
          driver_id,
          source_address,
          destination_address,
          ride_date,
          departure_time, driver_name
        )
      `,
      )
      .eq("rides.driver_id", driverId)
      .order("created_at", { ascending: false });

    if (rideId) {
      query = query.eq("ride_id", rideId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async updateStatus(supabase, id, userId, status) {
    const booking = await this.findById(supabase, id, userId);
    if (!booking) return false;
    const payload = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "accepted") {
      payload.accepted_at = new Date().toISOString();
      payload.confirmed_at = new Date().toISOString();
    }

    if (status === "cancelled" || status === "rejected") {
      payload.cancelled_at = new Date().toISOString();
    }

    if (status === "completed") {
      payload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("ride_bookings")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    return true;
  },
};

module.exports = BookingModel;
