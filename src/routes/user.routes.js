
const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const authMiddleware = require("../middleware/auth.middleware");
const { getFullProfile, updateProfile } = require("../controllers/user.controller");

router.get("/", authMiddleware, upload.single("profile_picture"), getFullProfile);
router.patch("/", authMiddleware, updateProfile);

module.exports = router;