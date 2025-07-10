    // backend/server.js

    // --- START: CRITICAL TROUBLESHOOTING LOGGING ---
    console.log('--- Render Backend Startup Log ---');
    console.log('Step 1: Starting Node.js process...');

    // Ensure dotenv is loaded first and only once.
    // Remove other dotenv.config() calls if present elsewhere in this file.
    require('dotenv').config();
    console.log('Step 2: Environment variables loaded.');

    // Log key environment variables (masking sensitive parts)
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DB_HOST:', process.env.DB_HOST ? '***SET***' : '***NOT SET***');
    console.log('DB_USER:', process.env.DB_USER ? '***SET***' : '***NOT SET***');
    console.log('DB_NAME:', process.env.DB_NAME ? '***SET***' : '***NOT SET***');
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***');
    console.log('SMTP_USER:', process.env.SMTP_USER ? '***SET***' : '***NOT SET***');
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : '***NOT SET***');
    console.log('CLIENT_URL:', process.env.CLIENT_URL);
    console.log('BASE_URL:', process.env.BASE_URL);
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : '***NOT SET***');
    console.log('SOCKET_IO_SECRET:', process.env.SOCKET_IO_SECRET ? '***SET***' : '***NOT SET***');


    // --- IMPORTANT: Database Pool Initialization ---
    // This is the most likely crash point. We'll wrap it in a try-catch.
    let pool;
    try {
        console.log('Step 3: Attempting to require db.js...');
        pool = require("./db"); // Your MySQL connection pool
        console.log('Step 4: db.js required successfully.');

        // Test database connection immediately after requiring pool
        // This will run asynchronously, but its errors will be caught.
        (async () => {
            try {
                console.log('Step 5: Attempting database connection test...');
                const connection = await pool.getConnection(); // Try to get a connection
                connection.release(); // Release the connection immediately
                console.log('Step 6: Database connection successful!');
            } catch (err) {
                console.error('Step 6: Database connection FAILED:', err.message);
                console.error('Database connection error details:', err.code, err.errno, err.sqlMessage);
                // If connection fails, it's a critical error.
                // You might want to exit the process or handle it gracefully.
                // For now, just logging is fine, but it indicates the root cause.
            }
        })();

    } catch (err) {
        console.error('Step 3/4 FAILED: Critical error requiring db.js or initializing pool:', err.message);
        console.error('Stack trace:', err.stack);
        // If this happens, the service will likely not start.
        // We're forcing a log here before the process potentially exits.
        process.exit(1); // Exit with an error code to make Render mark it as failed
    }
    // --- END: CRITICAL TROUBLESHOOTING LOGGING ---


    const express = require("express");
    const cors = require("cors");
    const http = require("http");
    const socketIo = require("socket.io");
    const jwt = require("jsonwebtoken"); // Already declared, but fine.
    const rateLimit = require("express-rate-limit");

    // Create Express app
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || "https://project-1-2alx.onrender.com", // Ensure CLIENT_URL is correct
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
        // Ensure pool is defined before trying to use it
        if (!pool) {
            return res.status(500).json({ status: "error", db: false, message: "Database pool not initialized" });
        }
        const [rows] = await pool.query("SELECT 1");
        res.json({ status: "ok", db: true });
      } catch (err) {
        console.error("Health check DB error:", err.message);
        res.status(500).json({ status: "error", db: false, message: err.message });
      }
    });

    // Socket.IO JWT authentication
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token"));
      // Ensure SOCKET_IO_SECRET is set on Render
      if (!process.env.SOCKET_IO_SECRET) {
          console.error("SOCKET_IO_SECRET is not defined!");
          return next(new Error("Server configuration error."));
      }
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
    const PORT = process.env.PORT || 5001; // Use Render's PORT or fallback to 5001
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('--- Render Backend Startup Complete ---');
    });

    // Add a global uncaught exception handler as a last resort for logging
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! Server is crashing:');
      console.error(err.stack);
      process.exit(1); // Exit to ensure Render marks as failed and logs
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('UNHANDLED REJECTION! Server is crashing:');
      console.error(reason);
      process.exit(1); // Exit to ensure Render marks as failed and logs
    });
    