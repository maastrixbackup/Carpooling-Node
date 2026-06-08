const VehicleModel = require("../models/vehicle.model");

const createVehicle = async (req, res) => {
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

        const existing = await VehicleModel.findByRegistrationNumber(
            registration_number.toUpperCase()
        );

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Vehicle with this registration number already exists.",
            });
        }

        const vehicle = await VehicleModel.create({
            userId: req.user.id,
            vehicleType: vehicle_type,
            brand,
            model,
            manufactureYear: manufacture_year,
            registrationNumber: registration_number.toUpperCase(),
            rcNumber: rc_number ? rc_number.toUpperCase() : null,
            color,
            seats: Number(seats),
            availableSeats: Number(available_seats || seats),
            fuelType: fuel_type,
        });

        return res.status(201).json({
            success: true,
            message: "Vehicle added successfully.",
            data: { vehicle },
        });
    } catch (error) {
        console.error("Create vehicle error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while adding vehicle.",
        });
    }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await VehicleModel.findById(
      id,
      req.user.id
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
      data: {
        vehicle,
      },
    });
  } catch (error) {
    console.error("Get vehicle by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching vehicle.",
    });
  }
};

const getMyVehicles = async (req, res) => {
    try {
        const vehicles = await VehicleModel.findAllByUser(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Vehicles fetched successfully.",
            data: { vehicles },
        });
    } catch (error) {
        console.error("Get vehicles error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching vehicles.",
        });
    }
};

const updateVehicle = async (req, res) => {
    try {
        const vehicle = await VehicleModel.findById(req.params.id, req.user.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found.",
            });
        }

        const updatedVehicle = await VehicleModel.update(req.params.id, req.user.id, {
            vehicleType: req.body.vehicle_type || vehicle.vehicle_type,
            brand: req.body.brand || vehicle.brand,
            model: req.body.model || vehicle.model,
            manufactureYear: req.body.manufacture_year || vehicle.manufacture_year,
            registrationNumber:
                req.body.registration_number?.toUpperCase() ||
                vehicle.registration_number,
            rcNumber: req.body.rc_number?.toUpperCase() || vehicle.rc_number,
            color: req.body.color || vehicle.color,
            seats: Number(req.body.seats || vehicle.seats),
            availableSeats: Number(
                req.body.available_seats || vehicle.available_seats
            ),
            fuelType: req.body.fuel_type || vehicle.fuel_type,
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully.",
            data: { vehicle: updatedVehicle },
        });
    } catch (error) {
        console.error("Update vehicle error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating vehicle.",
        });
    }
};

const deleteVehicle = async (req, res) => {
    try {
        const deleted = await VehicleModel.delete(req.params.id, req.user.id);
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
        console.error("Delete vehicle error:", error);

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
    getVehicleById
};