const AccountModel = {
  async findPendingDeletionRequest(supabase, userId) {
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async createDeletionRequest(supabase, userId) {
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async cancelDeletionRequest(supabase, userId) {
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async markUserDeletionRequested(supabase, userId, request) {
    const { data, error } = await supabase
      .from("user_details")
      .update({
        deletion_requested: true,
        deletion_requested_at: request.requested_at,
        deletion_scheduled_at: request.scheduled_delete_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async clearUserDeletionRequested(supabase, userId) {
    const { data, error } = await supabase
      .from("user_details")
      .update({
        deletion_requested: false,
        deletion_requested_at: null,
        deletion_scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },
};

module.exports = AccountModel;