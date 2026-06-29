const ChatModel = require("../../models/chat/chat.model");
const { supabaseAdmin } = require("../../config/supabase");
const NotificationEventService = require("../../services/notification-event.service");

const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await ChatModel.getUserRooms(supabaseAdmin, userId);

    const roomIds = rooms.map((room) => room.id);

    const otherUserIds = rooms.map((room) => {
      const isDriver = String(room.driver_id) === String(userId);
      return isDriver ? room.passenger_id : room.driver_id;
    });

    const [latestMessageMap, unreadCountMap, usersMap] = await Promise.all([
      ChatModel.getLatestMessagesByRoomIds(supabaseAdmin, roomIds),
      ChatModel.getUnreadCountsByRoomIds(supabaseAdmin, roomIds, userId),
      ChatModel.getUsersMap(supabaseAdmin, otherUserIds),
    ]);

    const mappedRooms = rooms.map((room) => {
      const roomId = String(room.id);
      const isDriver = String(room.driver_id) === String(userId);

      const otherUserId = isDriver ? room.passenger_id : room.driver_id;
      const otherUser = usersMap.get(String(otherUserId));

      const booking = Array.isArray(room.ride_bookings)
        ? room.ride_bookings[0]
        : room.ride_bookings || {};

      const ride = Array.isArray(room.rides) ? room.rides[0] : room.rides || {};
      const latestMessage = latestMessageMap.get(roomId);

      return {
        roomId,
        bookingId: room.booking_id ? String(room.booking_id) : null,
        rideId: room.ride_id ? String(room.ride_id) : null,
        role: isDriver ? "driver" : "passenger",
        name: otherUser?.full_name || (isDriver ? "Passenger" : "Driver"),
        phone: otherUser?.phone || null,
        profilePicture: otherUser?.profile_picture || null,

        avatarLetter:
          (otherUser?.full_name || (isDriver ? "P" : "D"))
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() || "U",

        roleLabel: isDriver ? "Passenger" : "Driver",
        from: booking.ride_source || ride.source_address || "",
        to: booking.ride_destination || ride.destination_address || "",
        rideDate: booking.ride_date || ride.ride_date || "",
        rideTime: booking.ride_time || ride.departure_time || "",
        rideStatus: booking.status || ride.status || "active",
        lastMessage: latestMessage?.message || "No messages yet",
        lastMessageAt: latestMessage?.created_at || room.created_at,
        unreadCount: unreadCountMap.get(roomId) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Chat rooms fetched successfully.",
      data: {
        passengerChats: mappedRooms.filter((item) => item.role === "driver"),
        driverChats: mappedRooms.filter((item) => item.role === "passenger"),
      },
    });
  } catch (error) {
    console.error("[ERROR] Get my rooms:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch chats.",
    });
  }
};

const getRoomByBooking = async (req, res) => {
  try {
    const room = await ChatModel.getRoomByBookingId(
      supabaseAdmin,
      req.params.bookingId,
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found.",
      });
    }

    const isParticipant =
      String(room.driver_id) === String(req.user.id) ||
      String(room.passenger_id) === String(req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch room.",
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const room = await ChatModel.getRoomById(supabaseAdmin, req.params.roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const isParticipant =
      String(room.driver_id) === String(req.user.id) ||
      String(room.passenger_id) === String(req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }
    const messages = await ChatModel.getMessages(
      supabaseAdmin,
      req.params.roomId,
    );
    return res.status(200).json({
      success: true,
      data: {
        messages,
        currentUserId: req.user.id,
        room: {
          id: room.id,
          booking_id: room.booking_id,
          ride_id: room.ride_id,
          passenger_id: room.passenger_id,
          driver_id: room.driver_id,
        },
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch messages.",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const room = await ChatModel.getRoomById(supabaseAdmin, req.params.roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const isParticipant =
      String(room.driver_id) === String(req.user.id) ||
      String(room.passenger_id) === String(req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const newMessage = await ChatModel.createMessage(supabaseAdmin, {
      roomId: room.id,
      senderId: req.user.id,
      message: message.trim(),
    });

    req.io.to(`room-${room.id}`).emit("new_message", newMessage);

    const receiverId =
      String(room.driver_id) === String(req.user.id)
        ? room.passenger_id
        : room.driver_id;

    const senderName = req.user?.full_name || req.user?.name;
    req.user?.user_metadata?.full_name || req.user?.email || "User";

    setImmediate(async () => {
      try {
        await NotificationEventService.notifyIncomingMessage({
          receiverId,
          senderName,
          roomId: room.id,
          bookingId: room.booking_id,
          rideId: room.ride_id,
        });
      } catch (notifyError) {
        console.error("[NOTIFICATION ERROR] Incoming message:", {
          roomId: room.id,
          receiverId,
          message: notifyError?.message,
          stack: notifyError?.stack,
        });
      }
    });

    return res.status(201).json({
      success: true,
      message: "Message sent.",
      data: { message: newMessage },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to send message.",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const room = await ChatModel.getRoomById(supabaseAdmin, req.params.roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const isParticipant =
      String(room.driver_id) === String(req.user.id) ||
      String(room.passenger_id) === String(req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    await ChatModel.markRoomMessagesRead(
      supabaseAdmin,
      req.params.roomId,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to update messages.",
    });
  }
};

module.exports = {
  getMyRooms,
  getRoomByBooking,
  getMessages,
  sendMessage,
  markAsRead,
};
