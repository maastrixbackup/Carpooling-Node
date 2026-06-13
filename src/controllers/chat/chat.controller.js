const ChatModel = require("../../models/chat/chat.model");
const { supabaseAdmin } = require("../../config/supabase");

const getMyRooms = async (req, res) => {
  try {
    const rooms = await ChatModel.getUserRooms(supabaseAdmin, req.user.id);

    return res.status(200).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    console.error(error);

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
