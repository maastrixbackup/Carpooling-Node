const express = require("express");
const { getMyRewards } = require("../controllers/reward.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", authMiddleware, getMyRewards);

module.exports = router;