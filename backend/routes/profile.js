// User profile management routes
const express = require("express");
const router = express.Router();
const db = require("../db");
const { auth } = require("../middleware/auth"); // Import named export

// Get user profile
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, role, verified, profile_image FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, profile_image } = req.body;
  try {
    await db.query(
      "UPDATE users SET name=?, email=?, phone=?, profile_image=? WHERE id=?",
      [name, email, phone, profile_image, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get landlord profile (for dashboard)
router.get("/landlord", auth, (req, res) => {
  if (req.user && req.user.role === "landlord") {
    const { _id, name, email, phone, isVerified, kycDocPath } = req.user;
    res.json({ id: _id, name, email, phone, isVerified, kycDocPath });
  } else {
    res.status(403).json({ message: "Not authorized" });
  }
});

// TODO: Add authentication middleware for security

module.exports = router;
