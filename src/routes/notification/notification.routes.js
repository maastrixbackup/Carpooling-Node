const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");

const {
  broadcastNotification,
  sendNotificationToUsers,
  getMyNotifications,
  deleteNotification
} = require("../../controllers/notification/notification.controller");

router.post("/broadcast",  broadcastNotification);
router.post("/send", authMiddleware, sendNotificationToUsers);
router.get("/", authMiddleware, getMyNotifications);
// router.delete("/:id", authMiddleware, deleteNotification);


module.exports = router;