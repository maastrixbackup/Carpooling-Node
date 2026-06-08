const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  createBooking,
  getMyBookings,
  getDriverBookings,
  getBookingById,
  cancelBooking,
} = require("../controllers/booking.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Booking routes are working.",
  });
});

router.post("/", createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/driver-bookings", getDriverBookings);
router.get("/:id", getBookingById);
router.patch("/:id/cancel", cancelBooking);

module.exports = router;