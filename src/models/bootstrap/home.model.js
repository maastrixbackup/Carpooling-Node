const HomeModel = {
  async getUserStats(supabase, userId) {
    const [{ count: bookingsCount }, { count: publishedRidesCount }] =
      await Promise.all([
        supabase
          .from("ride_bookings")
          .select("id", { count: "exact", head: true })
          .eq("passenger_id", userId),

        supabase
          .from("rides")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", userId),
      ]);

    return {
      total_bookings: bookingsCount || 0,
      total_published_rides: publishedRidesCount || 0,
    };
  },

  async getUpcomingBooking(supabase, userId) {
    const { data, error } = await supabase
      .from("ride_bookings")
      .select(`
        *,
        rides (
          id,
          driver_id,
          vehicle_id,
          source_address,
          destination_address,
          ride_date,
          departure_time,
          vehicles (
            brand,
            model,
            registration_number,
            color
          )
        )
      `)
      .eq("passenger_id", userId)
      .in("status", ["pending", "accepted", "ongoing", "payment_pending"])
      .gte("ride_date", new Date().toISOString().slice(0, 10))
      .order("ride_date", { ascending: true })
      .order("ride_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async getPopularRoutes(supabase) {
    const { data, error } = await supabase
      .from("rides")
      .select("source_address, destination_address")
      .eq("status", "scheduled")
      .limit(10);

    if (error) throw error;

    return data || [];
  },

  async getAvailableRides(supabase, filters = {}) {
    let query = supabase
      .from("rides")
      .select(`
        *,
        vehicles (
          brand,
          model,
          registration_number,
          color,
          rating
        )
      `)
      .eq("status", "scheduled")
      .gt("available_seats", 0)
      .order("ride_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(10);

    if (filters.source) {
      query = query.ilike("source_address", `%${filters.source}%`);
    }

    if (filters.destination) {
      query = query.ilike("destination_address", `%${filters.destination}%`);
    }

    if (filters.rideDate) {
      query = query.eq("ride_date", filters.rideDate);
    }

    if (filters.seats) {
      query = query.gte("available_seats", Number(filters.seats));
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },
};

module.exports = HomeModel;