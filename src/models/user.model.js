const { supabaseAdmin } = require("../config/supabase");

const UserModel = {
  async findById(id) {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authError) throw authError;

    if (!authData?.user) return null;

    const { data: details, error: detailsError } = await supabaseAdmin
      .from("user_details")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (detailsError) throw detailsError;

    return this.formatUser(authData.user, details);
  },

  async phoneExists(phone) {
    if (!phone) return false;

    const { data, error } = await supabaseAdmin
      .from("user_details")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async findFullProfileById(id) {
    return this.findById(id);
  },

  async findByEmail(email) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!user) return null;

    const { data: details, error: detailsError } = await supabaseAdmin
      .from("user_details")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (detailsError) throw detailsError;

    return this.formatUser(user, details);
  },

  async emailOrPhoneExists(email, phone) {
    const existingEmailUser = await this.findByEmail(email);

    if (existingEmailUser) return true;

    if (!phone) return false;

    const { data, error } = await supabaseAdmin
      .from("user_details")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },

  async updateProfile(id, payload) {
    const allowedPayload = {
      full_name: payload.full_name,
      phone: payload.phone,
      profile_picture: payload.profile_picture,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postal_code: payload.postal_code,
      address: payload.address,
    };

    Object.keys(allowedPayload).forEach((key) => {
      if (allowedPayload[key] === undefined) {
        delete allowedPayload[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from("user_details")
      .update(allowedPayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async updateVerificationStatus(id, status, rejectionReason = null) {
    const isVerified = status === "approved";

    const { data, error } = await supabaseAdmin
      .from("user_details")
      .update({
        verification_status: status,
        is_verified: isVerified,
        verification_rejection_reason: rejectionReason,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  formatUser(authUser, details = {}) {
    const metadata = authUser.user_metadata || {};

    return {
      id: authUser.id,
      email: authUser.email,
      phone: details?.phone || metadata.phone || authUser.phone || null,
      full_name: details?.full_name || metadata.full_name || null,
      role: details?.role || metadata.role || "passenger",
      email_verified_at: authUser.email_confirmed_at,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at,

      rating: Number(details?.rating || 0),
      total_rides: Number(details?.total_rides || 0),
      is_verified: Boolean(details?.is_verified),
      verification_status: details?.verification_status || "pending",

      address: details?.address || null,
      city: details?.city || null,
      state: details?.state || null,
      postal_code: details?.postal_code || null,
      profile_picture: details?.profile_picture || null,

      dl_verification_status: details?.dl_verification_status || "pending",
      aadhaar_verification_status:
        details?.aadhaar_verification_status || "pending",
      pan_verification_status: details?.pan_verification_status || "pending",
      bank_verification_status: details?.bank_verification_status || "pending",
    };
  },
};

module.exports = UserModel;
