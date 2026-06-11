

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { getFullProfile, updateProfile } = require("../controllers/user.controller");

router.get("/", authMiddleware, getFullProfile);
router.patch("/", authMiddleware, updateProfile);

module.exports = router;