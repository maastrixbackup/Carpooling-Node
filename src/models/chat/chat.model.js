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
      id,
      booking_id,
      ride_id,
      driver_id,
      passenger_id,
      created_at,
      ride_bookings (
        id,
        ride_source,
        ride_destination,
        ride_date,
        ride_time,
        status
      ),
      rides (
        id,
        source_address,
        destination_address,
        ride_date,
        departure_time,
        status
      )
    `,
      )
      .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
      .order("created_at", { ascending: false });

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

  async getLatestMessagesByRoomIds(supabase, roomIds = []) {
    if (!roomIds.length) return [];

    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        `
      id,
      room_id,
      sender_id,
      message,
      is_read,
      created_at
    `,
      )
      .in("room_id", roomIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const latestMap = new Map();

    for (const item of data || []) {
      const roomId = String(item.room_id);

      if (!latestMap.has(roomId)) {
        latestMap.set(roomId, item);
      }
    }

    return latestMap;
  },

  async getUnreadCountsByRoomIds(supabase, roomIds = [], currentUserId) {
    if (!roomIds.length) return new Map();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("room_id")
      .in("room_id", roomIds)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);

    if (error) throw error;

    const countMap = new Map();

    for (const item of data || []) {
      const roomId = String(item.room_id);
      countMap.set(roomId, (countMap.get(roomId) || 0) + 1);
    }

    return countMap;
  },

  async getUsersMap(supabase, userIds = []) {
    const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];

    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from("user_details")
      .select("id, full_name, phone, profile_picture")
      .in("id", uniqueIds);

    if (error) throw error;

    const map = new Map();

    for (const user of data || []) {
      map.set(String(user.id), user);
    }

    return map;
  },
};

module.exports = ChatModel;
