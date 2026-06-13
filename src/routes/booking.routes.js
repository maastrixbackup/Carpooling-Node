const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  createBooking,
  getMyBookings,
  getDriverBookings,
  getBookingById,
  cancelBooking,
  respondToBooking
} = require("../controllers/booking.controller");

const router = express.Router();


router.get("/", async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Booking routes are working.",
  });
});

router.post("/", authMiddleware, createBooking);
router.get("/my-bookings", authMiddleware, getMyBookings);
router.get("/driver-bookings", authMiddleware, getDriverBookings);
router.get("/:id", authMiddleware, getBookingById);
router.patch("/:id/cancel", authMiddleware, cancelBooking);
router.patch("/:id/respond", authMiddleware, respondToBooking);

module.exports = router;