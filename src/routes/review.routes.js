const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createReview,
  getDriverReviews,
} = require("../controllers/review.controller");

router.post("/", authMiddleware, createReview);

router.get("/driver/:driverId", getDriverReviews);

module.exports = router;
