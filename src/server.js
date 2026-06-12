const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const rideRoutes = require("./routes/ride.routes");
const bookingRoutes = require("./routes/booking.routes");
const homeRoutes = require("./routes/bootstrap/home.routes");
const reviewRoutes = require("./routes/review.routes");
const userRoutes = require("./routes/user.routes");
const pushTokenRoutes = require("./routes/notification/pushToken.routes");
const notificationRoutes = require("./routes/notification/notification.routes");
const chatRoutes = require("./routes/chat/chat.routes")
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(`room-${roomId}`);
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(`room-${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// routes...
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
app.use("/api/chats", chatRoutes);




app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚗 Car Pooling API running on port ${PORT}`);
});
