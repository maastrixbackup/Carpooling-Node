
const VehicleModel = require("../models/vehicle.model");

const normalizeRegistrationNumber = (value = "") => {
  return value.trim().toUpperCase().replace(/\s+/g, "");
};

const createVehicle = async (req, res) => {
  const traceId = `TX_${Date.now().toString().slice(-6)}`;
  console.log(
    `[CONTROLLER][${traceId}] Process initialized for user: ${req.user?.id}`,
  );

  try {
    const {
      vehicle_type,
      brand,
      model,
      manufacture_year,
      registration_number,
      rc_number,
      color,
      seats,
      available_seats,
      fuel_type,
    } = req.body;

    if (!vehicle_type || !brand || !model || !registration_number || !seats) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle type, brand, model, registration number, and seats are required.",
      });
    }

    const totalSeats = Number(seats);
    if (!Number.isFinite(totalSeats) || totalSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "Seats must be greater than 0.",
      });
    }

    const files = req.files || {};
    const photoFile = files["vehicle_photo"] ? files["vehicle_photo"][0] : null;
    const rcFile = files["rc_document"] ? files["rc_document"][0] : null;

    if (!photoFile || !rcFile) {
      return res.status(400).json({
        success: false,
        message:
          "Both a vehicle photo snapshot and an RC verification document file are required.",
      });
    }

    const normalizedReg = registration_number.trim().toUpperCase();
    const existing = await VehicleModel.findByRegistrationNumber(normalizedReg);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Vehicle with this registration number already exists.",
      });
    }

    const folderPath = `${normalizedReg}/photos`;

    // Inline isolated upload utility to guarantee CommonJS context safely
    const executeUpload = async (file) => {
      const extension = file.originalname.split(".").pop();
      const baseName = file.originalname.substring(
        0,
        file.originalname.lastIndexOf("."),
      );
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9]/g, "_");
      const targetPath = `${folderPath}/${sanitizedBase}.${extension}`;

      console.log(
        `[STORAGE][${traceId}] Uploading file payload to: "${targetPath}"`,
      );

      const { data, error } = await req.supabase.storage
        .from("vehicles")
        .upload(targetPath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase Storage fail: ${error.message}`);
      }

      const { data: publicUrlData } = req.supabase.storage
        .from("vehicles")
        .getPublicUrl(targetPath);

      return publicUrlData.publicUrl;
    };

    console.log(
      `[CONTROLLER][${traceId}] Processing parallel upload pipelines...`,
    );
    const [photoUrl, rcUrl] = await Promise.all([
      executeUpload(photoFile),
      executeUpload(rcFile),
    ]);

    const vehicle = await VehicleModel.create(req.supabase, {
      userId: req.user.id,
      vehicleType: vehicle_type,
      brand: brand.trim(),
      model: model.trim(),
      manufactureYear: manufacture_year,
      registrationNumber: normalizedReg,
      rcNumber: rc_number ? rc_number.trim().toUpperCase() : normalizedReg,
      color: color?.trim() || null,
      seats: totalSeats,
      availableSeats: Number(available_seats || totalSeats),
      fuelType: fuel_type || null,
      vehiclePhoto: photoUrl,
      rcDocument: rcUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle added and verified successfully.",
      data: { vehicle },
    });
  } catch (error) {
    console.error(
      `[CRITICAL SYSTEM ERROR][${traceId}] Component crashed:`,
      error?.message || error,
    );
    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while processing the backend vehicle data workflow.",
    });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(
      req.supabase,
      req.params.id,
      req.user.id,
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully.",
      data: { vehicle },
    });
  } catch (error) {
    console.error("[ERROR] Get vehicle by id:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching vehicle.",
    });
  }
};

const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.findAllByUser(
      req.supabase,
      req.user.id,
      { status: "active" }
    );

    return res.status(200).json({
      success: true,
      message: "Vehicles fetched successfully.",
      data: { vehicles },
    });
  } catch (error) {
    console.error("[ERROR] Get vehicles:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching vehicles.",
    });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(
      req.supabase,
      req.params.id,
      req.user.id,
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    const nextRegistration = req.body.registration_number
      ? normalizeRegistrationNumber(req.body.registration_number)
      : vehicle.registration_number;

    if (nextRegistration !== vehicle.registration_number) {
      const existing = await VehicleModel.findByRegistrationNumber(
        req.supabase,
        nextRegistration,
      );

      if (existing && String(existing.id) !== String(vehicle.id)) {
        return res.status(409).json({
          success: false,
          message: "Vehicle with this registration number already exists.",
        });
      }
    }

    const nextSeats = Number(req.body.seats || vehicle.seats);
    const nextAvailableSeats = Number(
      req.body.available_seats || vehicle.available_seats,
    );

    if (!Number.isFinite(nextSeats) || nextSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "Seats must be greater than 0.",
      });
    }

    if (
      !Number.isFinite(nextAvailableSeats) ||
      nextAvailableSeats < 0 ||
      nextAvailableSeats > nextSeats
    ) {
      return res.status(400).json({
        success: false,
        message: "Available seats must be between 0 and total seats.",
      });
    }

    const updatedVehicle = await VehicleModel.update(
      req.supabase,
      req.params.id,
      req.user.id,
      {
        vehicleType: req.body.vehicle_type || vehicle.vehicle_type,
        brand: req.body.brand || vehicle.brand,
        model: req.body.model || vehicle.model,
        manufactureYear: req.body.manufacture_year || vehicle.manufacture_year,
        registrationNumber: nextRegistration,
        rcNumber: req.body.rc_number
          ? normalizeRegistrationNumber(req.body.rc_number)
          : vehicle.rc_number,
        color: req.body.color || vehicle.color,
        seats: nextSeats,
        availableSeats: nextAvailableSeats,
        fuelType: req.body.fuel_type || vehicle.fuel_type,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully.",
      data: { vehicle: updatedVehicle },
    });
  } catch (error) {
    console.error("[ERROR] Update vehicle:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating vehicle.",
    });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    // Safer than hard delete because rides may reference this vehicle.
    const deleted = await VehicleModel.softDelete(
      req.supabase,
      req.params.id,
      req.user.id,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle removed successfully.",
    });
  } catch (error) {
    console.error("[ERROR] Delete vehicle:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while removing vehicle.",
    });
  }
};

module.exports = {
  createVehicle,
  getMyVehicles,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
};
