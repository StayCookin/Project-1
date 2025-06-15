// Admin routes for user management, verification, and dashboard
const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all users (admin only)
router.get("/users", async (req, res) => {
  // TODO: Add admin authentication middleware
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, verified FROM users"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Verify a user (admin action)
router.post("/verify-user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query("UPDATE users SET verified = 1 WHERE id = ?", [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify user" });
  }
});

// Set user role (admin action)
router.post("/set-role/:userId", async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  try {
    await db.query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});

module.exports = router;
