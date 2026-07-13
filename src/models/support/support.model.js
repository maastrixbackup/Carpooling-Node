const SupportModel = {
  async createTicket(
    supabase,
    {
      userId,
      ticketNumber,
      category,
      subject,
      description,
      relatedRideId = null,
      relatedBookingId = null,
      priority = "normal",
    },
  ) {
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        ticket_number: ticketNumber,
        category,
        subject,
        description,
        related_ride_id: relatedRideId,
        related_booking_id: relatedBookingId,
        priority,
        status: "open",
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async addAttachments(supabase, ticketId, attachments = []) {
    if (!attachments.length) return [];

    const payload = attachments.map((item) => ({
      ticket_id: ticketId,
      file_url: item.fileUrl,
      file_type: item.fileType || null,
    }));

    const { data, error } = await supabase
      .from("support_ticket_attachments")
      .insert(payload)
      .select("*");

    if (error) throw error;

    return data || [];
  },

  async findByUser(supabase, userId) {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        support_ticket_attachments (
          id,
          file_url,
          file_type,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async findByIdForUser(supabase, ticketId, userId) {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        support_ticket_attachments (
          id,
          file_url,
          file_type,
          created_at
        )
      `)
      .eq("id", ticketId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },
};

module.exports = SupportModel;