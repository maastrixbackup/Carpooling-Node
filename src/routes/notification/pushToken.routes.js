const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const { savePushToken, deactivatePushToken } = require("../../controllers/notification/pushToken.controller");

router.post("/", authMiddleware, savePushToken);
router.patch("/deactivate", authMiddleware, deactivatePushToken);

module.exports = router;