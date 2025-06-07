// backend/routes/reviews.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET all reviews
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM reviews ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST a new review
router.post("/", async (req, res) => {
  const { propertyId, userId, review, rating } = req.body;
  if (!propertyId || !userId || !review || !rating) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    await pool.query(
      "INSERT INTO reviews (propertyId, userId, review, rating, created_at) VALUES (?, ?, ?, ?, NOW())",
      [propertyId, userId, review, rating]
    );
    res.status(201).json({ success: true, message: "Review submitted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

module.exports = router;
