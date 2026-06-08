const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  createRide,
  getRides,
  getRideById,
  getMyRides,
  cancelRide,
  getRouteOptions,
} = require("../controllers/ride.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createRide);
router.post("/route-options", authMiddleware, getRouteOptions);
router.get("/", getRides);
router.get("/my-rides", getMyRides);
router.get("/:id", getRideById);
router.patch("/:id/cancel", cancelRide);

module.exports = router;