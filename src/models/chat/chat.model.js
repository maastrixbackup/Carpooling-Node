const ChatModel = {
  async createRoom(supabase, payload) {
    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({
        booking_id: payload.bookingId,
        ride_id: payload.rideId,
        passenger_id: payload.passengerId,
        driver_id: payload.driverId,
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async getRoomByBookingId(supabase, bookingId) {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async getRoomById(supabase, roomId) {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async getUserRooms(supabase, userId) {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select(
        `
        *,
        rides (
          id,
          source_address,
          destination_address
        )
      `,
      )
      .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async getMessages(supabase, roomId) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data || [];
  },

  async createMessage(supabase, payload) {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: payload.roomId,
        sender_id: payload.senderId,
        message: payload.message,
        message_type: payload.messageType || "text",
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase
      .from("chat_rooms")
      .update({
        updated_at: new Date().toISOString(),
        last_message: payload.message,
        last_message_at: new Date().toISOString(),
        last_message_sender_id: payload.senderId,
      })
      .eq("id", payload.roomId);

    return data;
  },

  async markRoomMessagesRead(supabase, roomId, userId) {
    const { error } = await supabase
      .from("chat_messages")
      .update({
        is_read: true,
      })
      .eq("room_id", roomId)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return true;
  },
};

module.exports = ChatModel;
