const express = require("express");
// Import both controller functions
const {
  registerUser,
  verifyEmail,
  resendOtp,
  loginUser,
  getCurrentUser,
} = require("../controllers/auth.controller");
const { auth } = require("../middleware/auth"); // Import the auth middleware

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);
// POST /api/auth/verify-email
router.post("/verify-email", verifyEmail);
// POST /api/auth/resend-otp
router.post("/resend-otp", resendOtp);
// POST /api/auth/login  <-- ADD THIS NEW ROUTE
router.post("/login", loginUser);

// Protected route - requires a valid token
// The `auth` middleware will run first. If the token is valid, it will call `getCurrentUser`.
router.get("/me", auth, getCurrentUser);

module.exports = router;
