const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");

const {
  getMyRooms,
  getRoomByBooking,
  getMessages,
  sendMessage,
  markAsRead,
} = require("../../controllers/chat/chat.controller");

router.use(authMiddleware);

router.get("/my-rooms", getMyRooms);

router.get("/booking/:bookingId", getRoomByBooking);

router.get("/:roomId/messages", getMessages);

router.post("/:roomId/messages", sendMessage);

router.patch("/:roomId/read", markAsRead);

module.exports = router;
