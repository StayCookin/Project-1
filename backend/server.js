const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://project-1-2alx.onrender.com",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DDoS protection: apply rate limiting to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ status: "ok", db: true });
  } catch (err) {
    res.status(500).json({ status: "error", db: false });
  }
});

// Socket.IO JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: No token"));
  jwt.verify(token, process.env.SOCKET_IO_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    socket.user = decoded;
    next();
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.user && socket.user.id);

  // Handle joining a chat room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Handle new messages
  socket.on("sendMessage", (data) => {
    io.to(data.roomId).emit("newMessage", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/properties", require("./routes/properties.routes"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/viewings", require("./routes/viewings"));
app.use("/api/reviews", require("./routes/reviews"));
const inquiryRoutes = require("./routes/inquiries.routes");
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/admin", require("./routes/admin"));
app.use("/api/profile", require("./routes/profile"));
const savedPropertiesRoutes = require("./routes/saved-properties");
app.use("/api/saved-properties", savedPropertiesRoutes);
app.use("/api/landlord", require("./routes/landlord-dashboard"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
