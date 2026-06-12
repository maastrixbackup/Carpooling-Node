const RideModel = {
  async create(supabase, payload) {
    const { data, error } = await supabase.rpc("create_ride_with_route_line", {
      p_driver_id: payload.driverId,
      p_vehicle_id: payload.vehicleId,

      p_source_address: payload.sourceAddress,
      p_source_place_id: payload.sourcePlaceId || null,

      p_destination_address: payload.destinationAddress,
      p_destination_place_id: payload.destinationPlaceId || null,

      p_source_lat: payload.sourceLat,
      p_source_lng: payload.sourceLng,
      p_destination_lat: payload.destinationLat,
      p_destination_lng: payload.destinationLng,

      p_ride_date: payload.rideDate,
      p_departure_time: payload.departureTime,

      p_polyline: payload.polyline || null,
      p_route_line_wkt: payload.routeLineWkt || null,

      p_distance_meters: payload.distanceMeters || null,
      p_duration_seconds: payload.durationSeconds || null,
      p_estimated_reach_time: payload.estimatedReachTime || null,

      p_pet_allowed: payload.petAllowed || "no",
      p_smoking_allowed: payload.smokingAllowed || "no",
      p_instant_booking: payload.instantBooking || "yes",
      p_max_two_in_back: payload.maxTwoInBack || "no",

      p_price_per_km: payload.pricePerKm || 0,
      p_price_per_seat: payload.pricePerSeat || 0,

      p_total_seats: payload.totalSeats,
      p_available_seats: payload.availableSeats || payload.totalSeats,
    });
    if (error) throw error;
    return data;
  },

  async findById(supabase, id) {
    const { data, error } = await supabase
      .from("rides_with_driver")
      .select(
        `
      *,
      vehicles (
        brand,
        model,
        registration_number,
        color,
        rating
      )
    `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findAll(supabase, filters = {}) {
    let query = supabase
      .from("rides_with_driver")
      .select(
        `
      *,
      vehicles (
        brand,
        model,
        registration_number,
        color,
        rating
      )
    `,
      )
      .eq("status", "scheduled")
      .gt("available_seats", 0)
      .order("ride_date", { ascending: true })
      .order("departure_time", { ascending: true });

    if (filters.source) {
      query = query.ilike("source_address", `%${filters.source}%`);
    }

    if (filters.destination) {
      query = query.ilike("destination_address", `%${filters.destination}%`);
    }

    if (filters.rideDate) {
      query = query.eq("ride_date", filters.rideDate);
    }

    if (filters.minSeats) {
      query = query.gte("available_seats", Number(filters.minSeats));
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  async searchMatchedRides(supabase, filters = {}) {
    const { data, error } = await supabase.rpc("search_matched_rides", {
      p_source_lat: Number(filters.sourceLat),
      p_source_lng: Number(filters.sourceLng),
      p_destination_lat: Number(filters.destinationLat),
      p_destination_lng: Number(filters.destinationLng),
      p_ride_date: filters.rideDate || null,
      p_min_seats: Number(filters.minSeats || 1),
      p_max_distance_meters: 15000,
    });

    if (error) throw error;
    return data || [];
  },

  async findByDriver(supabase, driverId) {
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        vehicles (
          brand,
          model,
          registration_number,
          color
        )
      `,
      )
      .eq("driver_id", driverId)
      .order("ride_date", { ascending: false })
      .order("departure_time", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async updateStatus(supabase, id, driverId, status) {
    const { data, error } = await supabase
      .from("rides")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("driver_id", driverId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async findForBooking(supabase, id) {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", id)
      .eq("status", "scheduled")
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async decreaseAvailableSeats(supabase, id, seats) {
    const ride = await this.findForBooking(supabase, id);

    if (!ride) return false;

    if (Number(ride.available_seats) < Number(seats)) {
      return false;
    }

    const { data, error } = await supabase
      .from("rides")
      .update({
        available_seats: Number(ride.available_seats) - Number(seats),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "scheduled")
      .gte("available_seats", Number(seats))
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async increaseAvailableSeats(supabase, id, seats) {
    const ride = await this.findById(supabase, id);

    if (!ride) return false;

    const nextSeats = Number(ride.available_seats || 0) + Number(seats);

    const { data, error } = await supabase
      .from("rides")
      .update({
        available_seats: nextSeats,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async findDriverRideById(supabase, rideId, driverId) {
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        vehicles (
          brand,
          model,
          registration_number,
          color
        )
      `,
      )
      .eq("id", rideId)
      .eq("driver_id", driverId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findRideBookingsForDriver(supabase, rideId, driverId) {
    const ride = await this.findDriverRideById(supabase, rideId, driverId);

    if (!ride) return [];

    const { data, error } = await supabase
      .from("ride_bookings")
      .select("*")
      .eq("ride_id", rideId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async updateDriverRide(supabase, rideId, driverId, payload) {
    const { data, error } = await supabase
      .from("rides")
      .update({
        price_per_seat: payload.price_per_seat,
        price_per_km: payload.price_per_km,
        available_seats: payload.available_seats,
        pet_allowed: payload.pet_allowed,
        smoking_allowed: payload.smoking_allowed,
        instant_booking: payload.instant_booking,
        max_two_in_back: payload.max_two_in_back,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("driver_id", driverId)
      .neq("status", "cancelled")
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async startRide(supabase, rideId, driverId) {
    const ride = await this.findDriverRideById(supabase, rideId, driverId);

    if (!ride) {
      return { success: false, reason: "ride_not_found_or_not_owner" };
    }

    if (ride.status !== "scheduled") {
      return { success: false, reason: `invalid_status_${ride.status}` };
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("rides")
      .update({
        status: "ongoing",
        started_at: now,
        updated_at: now,
      })
      .eq("id", rideId)
      .eq("driver_id", driverId)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { success: false, reason: "ride_update_failed" };
    }

    const { error: bookingError } = await supabase
      .from("ride_bookings")
      .update({
        status: "ongoing",
        updated_at: now,
      })
      .eq("ride_id", rideId)
      .eq("status", "accepted");

    if (bookingError) throw bookingError;

    return { success: true };
  },

  async completeRide(supabase, rideId, driverId) {
    const ride = await this.findDriverRideById(supabase, rideId, driverId);

    if (!ride) {
      return { success: false, reason: "ride_not_found_or_not_owner" };
    }

    if (ride.status !== "ongoing") {
      return { success: false, reason: `invalid_status_${ride.status}` };
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("rides")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", rideId)
      .eq("driver_id", driverId)
      .eq("status", "ongoing")
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { success: false, reason: "ride_update_failed" };
    }

    const { error: bookingError } = await supabase
      .from("ride_bookings")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("ride_id", rideId)
      .eq("status", "ongoing");

    if (bookingError) throw bookingError;

    return { success: true };
  },
};

module.exports = RideModel;
