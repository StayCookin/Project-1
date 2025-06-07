const express = require("express");
const { auth } = require("../middleware/auth");
const {
  createInquiry,
  getLandlordInquiries,
  getStudentInquiries,
} = require("../controllers/inquiry.controller");

const router = express.Router();

// Student submits an inquiry
router.post("/", auth, createInquiry);

// Landlord views all inquiries sent to them
router.get("/landlord", auth, getLandlordInquiries);

// Student views all their inquiries
router.get("/student", auth, getStudentInquiries);

module.exports = router;
