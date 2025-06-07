const express = require("express");
const notificationService = require("./services/notificationService");
const db = require("./db"); // MySQL connection

const app = express();

// Initialize notification service
notificationService.scheduleReminders();

// Example route: Get all users
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
