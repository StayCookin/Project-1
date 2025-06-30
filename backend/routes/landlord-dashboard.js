const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const prisma = require("../utils/prisma");

// Landlord dashboard aggregate endpoint
router.get("/dashboard", auth, checkRole(["landlord"]), async (req, res) => {
  try {
    const landlordId = req.user.id;
    // Active listings
    const activeListings = await prisma.property.count({
      where: {
        landlordId: landlordId,
        isAvailable: true,
      },
    });
    // Pending reviews (example: properties with reviews not yet responded to)
    // Adjust this logic as needed based on your schema
    const pendingReview = 0; // Placeholder, implement if you have a reviews model
    // Tenant enquiries
    const tenantEnquiries = await prisma.inquiry.count({
      where: {
        property: {
          landlordId: landlordId,
        },
        // status: "pending", // Uncomment if you add a status field
      },
    });
    // Unread messages
    const unreadMessages = 0; // Placeholder, implement if you have a messages model
    // All properties
    const properties = await prisma.property.findMany({
      where: { landlordId: landlordId },
    });
    res.json({
      activeListings,
      pendingReview,
      tenantEnquiries,
      unreadMessages,
      properties,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading dashboard" });
  }
});

module.exports = router;
