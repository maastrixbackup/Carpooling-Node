const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicle.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createVehicle);
router.get("/", getMyVehicles);
router.get("/:id", getVehicleById);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;