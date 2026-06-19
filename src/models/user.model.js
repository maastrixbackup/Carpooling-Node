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

  async findDetailsById(supabase, userId) {
    const { data, error } = await supabase
      .from("user_details")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async updateDetails(supabase, userId, payload) {
    const { data, error } = await supabase
      .from("user_details")
      .update(payload)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async markPhoneVerified(supabase, userId, phone) {
    return this.updateDetails(supabase, userId, {
      phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      onboarding_step: "aadhaar",
    });
  },

  async submitAadhaar(supabase, userId, { aadhaarHash, aadhaarLast4 }) {
    return this.updateDetails(supabase, userId, {
      aadhaar_hash: aadhaarHash,
      aadhaar_last4: aadhaarLast4,
      aadhaar_submitted_at: new Date().toISOString(),
      aadhaar_verification_status: "approved",
      onboarding_step: "bank",
    });
  },

  async submitBank(supabase, userId, payload) {
    return this.updateDetails(supabase, userId, {
      bank_account_holder: payload.bankAccountHolder,
      bank_account_number: payload.bankAccountNumber,
      bank_account_ifsc: payload.bankAccountIfsc,
      bank_name: payload.bankName,
      bank_verification_status: "approved",
    });
  },

  async submitIdentity(supabase, userId, payload) {
    const updatePayload = {
      identity_type: payload.identityType,
      identity_hash: payload.identityHash,
      identity_last4: payload.identityLast4,
      identity_submitted_at: new Date().toISOString(),
      onboarding_step: "bank",
    };

    if (payload.identityType === "aadhaar") {
      updatePayload.aadhaar_hash = payload.identityHash;
      updatePayload.aadhaar_last4 = payload.identityLast4;
      updatePayload.aadhaar_submitted_at = new Date().toISOString();
      updatePayload.aadhaar_verification_status = "approved";
      updatePayload.pan_verification_status = "pending";
    }

    if (payload.identityType === "pan") {
      updatePayload.pan_hash = payload.identityHash;
      updatePayload.pan_last4 = payload.identityLast4;
      updatePayload.pan_submitted_at = new Date().toISOString();
      updatePayload.pan_verification_status = "approved";
      updatePayload.aadhaar_verification_status = "pending";
    }

    return this.updateDetails(supabase, userId, updatePayload);
  },
};

module.exports = UserModel;
