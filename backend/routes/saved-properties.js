const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const SavedProperty = require("../models/SavedProperty");

// Save a property for the logged-in user
router.post("/", auth, async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId)
      return res.status(400).json({ message: "Property ID required" });
    const exists = await SavedProperty.findOne({
      user: req.user._id,
      property: propertyId,
    });
    if (exists) return res.status(409).json({ message: "Already saved" });
    const saved = new SavedProperty({
      user: req.user._id,
      property: propertyId,
    });
    await saved.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving property" });
  }
});

// Get all saved properties for the logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const saved = await SavedProperty.find({ user: req.user._id }).populate(
      "property"
    );
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error fetching saved properties" });
  }
});

// Remove a saved property
router.delete("/:propertyId", auth, async (req, res) => {
  try {
    await SavedProperty.deleteOne({
      user: req.user._id,
      property: req.params.propertyId,
    });
    res.json({ message: "Removed" });
  } catch (err) {
    res.status(500).json({ message: "Error removing saved property" });
  }
});

module.exports = router;
