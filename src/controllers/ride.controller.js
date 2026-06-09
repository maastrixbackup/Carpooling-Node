const RideModel = require("../models/ride.model");
const VehicleModel = require("../models/vehicle.model");
const { getDrivingRoutes } = require("../utils/route.utils");

const createRide = async (req, res) => {
  try {
    const {
      vehicle_id,
      source_address,
      source_place_id,
      destination_address,
      destination_place_id,
      source_lat,
      source_lng,
      destination_lat,
      destination_lng,
      ride_date,
      departure_time,
      pet_allowed,
      smoking_allowed,
      instant_booking,
      max_two_in_back,
      price_per_seat,
      total_seats,
      available_seats,
      selected_route_index,
    } = req.body;

    if (
      !vehicle_id ||
      !source_address ||
      !destination_address ||
      !source_lat ||
      !source_lng ||
      !destination_lat ||
      !destination_lng ||
      !ride_date ||
      !departure_time ||
      !price_per_seat ||
      !total_seats
    ) {
      return res.status(400).json({
        success: false,
        message: "Required ride details are missing.",
      });
    }

    const vehicle = await VehicleModel.findById(vehicle_id, req.user.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this user.",
      });
    }

    const routes = await getDrivingRoutes({
      sourceLat: Number(source_lat),
      sourceLng: Number(source_lng),
      destinationLat: Number(destination_lat),
      destinationLng: Number(destination_lng),
    });

    if (!routes || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid route found between source and destination.",
      });
    }

    const routeIndex = Number(selected_route_index || 0);

    const selectedRoute = routes[routeIndex] || routes[0];

    const estimatedReachTime = calculateEstimatedReachTime(
      ride_date,
      departure_time,
      selectedRoute.duration_seconds
    );

    const ride = await RideModel.create({
      driverId: req.user.id,
      vehicleId: vehicle_id,

      sourceAddress: source_address,
      sourcePlaceId: source_place_id || null,
      destinationAddress: destination_address,
      destinationPlaceId: destination_place_id || null,

      sourceLat: Number(source_lat),
      sourceLng: Number(source_lng),
      destinationLat: Number(destination_lat),
      destinationLng: Number(destination_lng),

      routePoints: selectedRoute.route_points,
      rideDate: ride_date,
      departureTime: departure_time,

      polyline: selectedRoute.polyline,
      distanceMeters: selectedRoute.distance_meters,
      durationSeconds: selectedRoute.duration_seconds,
      estimatedReachTime,

      petAllowed: pet_allowed || "no",
      smokingAllowed: smoking_allowed || "no",
      instantBooking: instant_booking || "yes",
      maxTwoInBack: max_two_in_back || "no",

      pricePerSeat: Number(price_per_seat),
      totalSeats: Number(total_seats),
      availableSeats: Number(available_seats || total_seats),
    });

    return res.status(201).json({
      success: true,
      message: "Ride published successfully.",
      data: { ride },
    });
  } catch (error) {
    console.error("Create ride error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while publishing ride.",
    });
  }
};

const getRides = async (req, res) => {
  try {
    const rides = await RideModel.findAll({
      source: req.query.source,
      destination: req.query.destination,
      rideDate: req.query.ride_date,
      minSeats: req.query.min_seats,
    });

    return res.status(200).json({
      success: true,
      message: "Rides fetched successfully.",
      data: { rides },
    });
  } catch (error) {
    console.error("Get rides error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching rides.",
    });
  }
};

const getRideById = async (req, res) => {
  try {
    const ride = await RideModel.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ride fetched successfully.",
      data: { ride },
    });
  } catch (error) {
    console.error("Get ride by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching ride.",
    });
  }
};

const getMyRides = async (req, res) => {
  try {
    const rides = await RideModel.findByDriver(req.user.id);

    return res.status(200).json({
      success: true,
      message: "My rides fetched successfully.",
      data: { rides },
    });
  } catch (error) {
    console.error("Get my rides error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching your rides.",
    });
  }
};

const cancelRide = async (req, res) => {
  try {
    const updated = await RideModel.updateStatus(
      req.params.id,
      req.user.id,
      "cancelled"
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not owned by you.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling ride.",
    });
  }
};


const getRouteOptions = async (req, res) => {
  try {
    const {
      source_lat,
      source_lng,
      destination_lat,
      destination_lng,
    } = req.body;

    if (!source_lat || !source_lng || !destination_lat || !destination_lng) {
      return res.status(400).json({
        success: false,
        message: "Source and destination coordinates are required.",
      });
    }

    const routes = await getDrivingRoutes({
      sourceLat: source_lat,
      sourceLng: source_lng,
      destinationLat: destination_lat,
      destinationLng: destination_lng,
    });

    return res.status(200).json({
      success: true,
      message: "Route options fetched successfully.",
      data: { routes },
    });
  } catch (error) {
    console.error("Route options error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch route options.",
    });
  }
};


const getDriverRideDetails = async (req, res) => {
  try {
    const rideId = req.params.id;
    const driverId = req.user.id;

    const ride = await RideModel.findDriverRideById(rideId, driverId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not owned by you.",
      });
    }

    const bookings = await RideModel.findRideBookingsForDriver(
      rideId,
      driverId
    );

    return res.status(200).json({
      success: true,
      message: "Driver ride details fetched successfully.",
      data: {
        ride,
        bookings,
      },
    });
  } catch (error) {
    console.error("Driver ride details error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching driver ride details.",
    });
  }
};

const updateRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    const driverId = req.user.id;

    const allowedPayload = {
      price_per_seat: req.body.price_per_seat,
      available_seats: req.body.available_seats,
      pet_allowed: req.body.pet_allowed,
      smoking_allowed: req.body.smoking_allowed,
      instant_booking: req.body.instant_booking,
      max_two_in_back: req.body.max_two_in_back,
    };

    const updated = await RideModel.updateDriverRide(
      rideId,
      driverId,
      allowedPayload
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not owned by you.",
      });
    }

    const ride = await RideModel.findDriverRideById(rideId, driverId);

    return res.status(200).json({
      success: true,
      message: "Ride updated successfully.",
      data: { ride },
    });
  } catch (error) {
    console.error("Update ride error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating ride.",
    });
  }
};

function calculateEstimatedReachTime(rideDate, departureTime, durationSeconds) {
  if (!rideDate || !departureTime || !durationSeconds) return null;

  const start = new Date(`${rideDate}T${departureTime}`);

  if (Number.isNaN(start.getTime())) return null;

  start.setSeconds(start.getSeconds() + Number(durationSeconds));

  return start.toISOString().slice(0, 19).replace("T", " ");
}

module.exports = {
  createRide,
  getRides,
  getRideById,
  getMyRides,
  cancelRide,
  getRouteOptions,
  getDriverRideDetails,
  updateRide,
};