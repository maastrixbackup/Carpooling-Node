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
} = require("../controllers/ride.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createRide);
router.post("/route-options", authMiddleware, getRouteOptions);
router.get("/", getRides);
router.get("/my-rides", getMyRides);
router.patch("/:id/cancel", cancelRide);
router.patch("/:id", authMiddleware, updateRide);
router.get("/:id/driver", authMiddleware, getDriverRideDetails);
router.get("/:id", getRideById);

module.exports = router;