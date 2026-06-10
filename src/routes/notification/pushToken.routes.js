const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const { savePushToken } = require("../../controllers/notification/pushToken.controller");

router.post("/", authMiddleware, savePushToken);

module.exports = router;