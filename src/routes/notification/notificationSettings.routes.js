const express = require("express");
const {
  getMyNotificationSettings,
  updateMyNotificationSettings,
} = require("../../controllers/notification/notificationSettings.controller");
const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getMyNotificationSettings);
router.patch("/", authMiddleware, updateMyNotificationSettings);

module.exports = router;