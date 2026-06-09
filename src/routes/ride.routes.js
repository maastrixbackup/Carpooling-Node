const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  createRide,
  getRides,
  getRideById,
  getMyRides,
  cancelRide,
  getRouteOptions,
  getDriverRideDetails,
  updateRide,
  startRide,
  completeRide,
} = require("../controllers/ride.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/route-options", authMiddleware, getRouteOptions);
router.post("/", authMiddleware, createRide);
router.get("/my-rides", authMiddleware, getMyRides);

router.get("/:id/driver", authMiddleware, getDriverRideDetails);
router.get("/:id", getRideById);
router.get("/", getRides);

router.patch("/:id/start", authMiddleware, startRide);
router.patch("/:id/complete", authMiddleware, completeRide);

router.patch("/:id/cancel", authMiddleware, cancelRide);
router.patch("/:id", authMiddleware, updateRide);

module.exports = router;