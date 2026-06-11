const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const rideRoutes = require("./routes/ride.routes");
const bookingRoutes = require("./routes/booking.routes");
const homeRoutes = require("./routes/bootstrap/home.routes");
const reviewRoutes = require("./routes/review.routes");
const userRoutes = require("./routes/user.routes");
const pushTokenRoutes = require("./routes/notification/pushToken.routes");
const notificationRoutes = require("./routes/notification/notification.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Car Pooling API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/bootstrap", homeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/push-tokens", pushTokenRoutes);
app.use("/api/notifications", notificationRoutes);


const router = express.Router();
router.get("/test-admin", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("user_details")
    .select("*")
    .limit(5);

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  return res.json({
    success: true,
    data,
  });
});



app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚗 Car Pooling API running on port ${PORT}`);
});
