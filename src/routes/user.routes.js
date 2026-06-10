

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { getFullProfile } = require("../controllers/user.controller");

router.get("/", authMiddleware, getFullProfile);

module.exports = router;