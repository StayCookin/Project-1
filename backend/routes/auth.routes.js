const express = require("express");
// Import both controller functions
const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/auth.controller");
const { auth } = require("../middleware/auth"); // Import the auth middleware

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login  <-- ADD THIS NEW ROUTE
router.post("/login", loginUser);

// Protected route - requires a valid token
// The `auth` middleware will run first. If the token is valid, it will call `getCurrentUser`.
router.get("/me", auth, getCurrentUser);

module.exports = router;
