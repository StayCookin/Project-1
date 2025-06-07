const express = require("express");
const {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} = require("../controllers/property.controller");
const { auth, checkRole } = require("../middleware/auth"); // Import our middleware

const router = express.Router();

// GET /api/properties - This is a public route, anyone can see listings
router.get("/", getAllProperties);

// GET /api/properties/:id - Gets a single property by its ID
router.get("/:id", getPropertyById);

// POST /api/properties - This is a protected route.
// Only a logged-in user with the role of 'LANDLORD' can create a property.
router.post(
  "/",
  auth, // 1. User must be logged in
  checkRole(["LANDLORD"]), // 2. User's role must be 'LANDLORD'
  createProperty // 3. If checks pass, proceed to create the property
);

// PUT /api/properties/:id - Update a property (LANDLORD only)
router.put("/:id", auth, checkRole(["LANDLORD"]), updateProperty);

// DELETE /api/properties/:id - Delete a property (LANDLORD only)
router.delete("/:id", auth, checkRole(["LANDLORD"]), deleteProperty);

module.exports = router;
