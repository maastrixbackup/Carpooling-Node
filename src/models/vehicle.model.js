const { supabaseAdmin } = require("../config/supabase");

const VehicleModel = {
  async create(
    supabase,
    {
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
    },
  ) {
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        user_id: userId,
        vehicle_type: vehicleType,
        brand,
        model,
        manufacture_year: manufactureYear || null,
        registration_number: registrationNumber,
        rc_number: rcNumber || null,
        color: color || null,
        seats,
        available_seats: availableSeats,
        fuel_type: fuelType || null,
        status: "active",
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async findAllByUser(supabase, userId) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "blocked")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async findById(supabase, id, userId) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findByRegistrationNumber(registrationNumber) {
    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, user_id, registration_number")
      .eq("registration_number", registrationNumber)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },
  
  async update(supabase, id, userId, payload) {
    const updatePayload = {
      vehicle_type: payload.vehicleType,
      brand: payload.brand,
      model: payload.model,
      manufacture_year: payload.manufactureYear || null,
      registration_number: payload.registrationNumber,
      rc_number: payload.rcNumber || null,
      color: payload.color || null,
      seats: payload.seats,
      available_seats: payload.availableSeats,
      fuel_type: payload.fuelType || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("vehicles")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async delete(supabase, id, userId) {
    const { data, error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async softDelete(supabase, id, userId) {
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },
};

module.exports = VehicleModel;
