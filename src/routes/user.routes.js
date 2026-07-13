
const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const authMiddleware = require("../middleware/auth.middleware");
const { getFullProfile, updateProfile } = require("../controllers/user.controller");

router.get("/", authMiddleware, getFullProfile);
router.patch("/", authMiddleware, upload.single("profile_picture"), updateProfile);

module.exports = router;