const express = require("express");
const {
    signup,
    login,
    me,
    logout,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Auth route is working",
    });
});

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

module.exports = router;