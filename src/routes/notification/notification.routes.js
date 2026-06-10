const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");

const {
  broadcastNotification,
  sendNotificationToUsers,
} = require("../../controllers/notification/notification.controller");

router.post("/broadcast",  broadcastNotification);
router.post("/send", authMiddleware, sendNotificationToUsers);

module.exports = router;