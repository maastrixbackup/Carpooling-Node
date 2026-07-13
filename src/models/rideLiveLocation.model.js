const RideLiveLocationModel = {
  async upsertLocation(supabase, payload) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("ride_live_locations")
      .upsert(
        {
          ride_id: payload.rideId,
          driver_id: payload.driverId,
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading ?? null,
          speed: payload.speed ?? null,
          accuracy: payload.accuracy ?? null,
          status: "active",
          updated_at: now,
        },
        { onConflict: "ride_id" },
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getByRideId(supabase, rideId) {
    const { data, error } = await supabase
      .from("ride_live_locations")
      .select("*")
      .eq("ride_id", rideId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async stopTracking(supabase, rideId) {
    const { error } = await supabase
      .from("ride_live_locations")
      .update({
        status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .eq("ride_id", rideId);

    if (error) throw error;
    return true;
  },
};

module.exports = RideLiveLocationModel;