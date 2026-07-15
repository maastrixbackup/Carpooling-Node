const express = require("express");
const multer = require("multer"); // 🌟 Added missing multer import
const authMiddleware = require("../middleware/auth.middleware");

const {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicle.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum limit threshold matching frontend
});

const vehicleUploadFields = upload.fields([
  { name: "vehicle_photo", maxCount: 1 },
  { name: "rc_document", maxCount: 1 },
]);

router.use(authMiddleware);

router.post("/", vehicleUploadFields, createVehicle);

router.get("/", getMyVehicles);
router.get("/:id", getVehicleById);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;