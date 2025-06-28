const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Property = require("../models/Property");
const { auth, checkRole } = require("../middleware/auth");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for image upload
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get all properties with filters
router.get("/", async (req, res) => {
  try {
    const {
      search,
      location,
      type,
      minPrice,
      maxPrice,
      amenities,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = { status: "available" };

    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Add location filter
    if (location) {
      query.location = new RegExp(location, "i");
    }

    // Add type filter
    if (type) {
      query.type = type;
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Add amenities filter
    if (amenities) {
      const amenityList = amenities.split(",");
      amenityList.forEach((amenity) => {
        query[`features.${amenity}`] = true;
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination and sorting
    const properties = await Property.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("landlord", "name email phone")
      .populate("reviews");

    // Get total count for pagination
    const total = await Property.countDocuments(query);

    res.json({
      properties,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching properties" });
  }
});

// Get single property
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("landlord", "name email phone")
      .populate("reviews");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Error fetching property" });
  }
});

// Create new property (landlord only)
router.post(
  "/",
  auth,
  checkRole(["landlord"]),
  upload.array("images", 5),
  async (req, res) => {
    try {
      const propertyData = JSON.parse(req.body.property);
      propertyData.landlord = req.user._id;

      // Upload images to Cloudinary
      const imagePromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.buffer.toString("base64"), {
          folder: "inrent/properties",
        })
      );

      const uploadedImages = await Promise.all(imagePromises);
      propertyData.images = uploadedImages.map((img) => ({
        url: img.secure_url,
        public_id: img.public_id,
      }));

      const property = new Property(propertyData);
      await property.save();

      res.status(201).json(property);
    } catch (error) {
      res.status(500).json({ message: "Error creating property" });
    }
  }
);

// Update property (landlord only)
router.put(
  "/:id",
  auth,
  checkRole(["landlord"]),
  upload.array("images", 5),
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check ownership
      if (property.landlord.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this property" });
      }

      const propertyData = JSON.parse(req.body.property);

      // Handle new images
      if (req.files && req.files.length > 0) {
        // Delete old images from Cloudinary
        const deletePromises = property.images.map((img) =>
          cloudinary.uploader.destroy(img.public_id)
        );
        await Promise.all(deletePromises);

        // Upload new images
        const uploadPromises = req.files.map((file) =>
          cloudinary.uploader.upload(file.buffer.toString("base64"), {
            folder: "inrent/properties",
          })
        );

        const uploadedImages = await Promise.all(uploadPromises);
        propertyData.images = uploadedImages.map((img) => ({
          url: img.secure_url,
          public_id: img.public_id,
        }));
      }

      // Update property
      Object.assign(property, propertyData);
      await property.save();

      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Error updating property" });
    }
  }
);

// Delete property (landlord only)
router.delete("/:id", auth, checkRole(["landlord"]), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check ownership
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this property" });
    }

    // Delete images from Cloudinary
    const deletePromises = property.images.map((img) =>
      cloudinary.uploader.destroy(img.public_id)
    );
    await Promise.all(deletePromises);

    await property.remove();
    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting property" });
  }
});

// Save/unsave property (student only)
router.post("/:id/save", auth, checkRole(["student"]), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const user = req.user;
    const isSaved = user.savedProperties.includes(property._id);

    if (isSaved) {
      // Unsave property
      user.savedProperties = user.savedProperties.filter(
        (id) => id.toString() !== property._id.toString()
      );
      property.savedBy = property.savedBy.filter(
        (id) => id.toString() !== user._id.toString()
      );
    } else {
      // Save property
      user.savedProperties.push(property._id);
      property.savedBy.push(user._id);
    }

    await Promise.all([user.save(), property.save()]);

    res.json({
      message: isSaved ? "Property unsaved" : "Property saved",
      isSaved: !isSaved,
    });
  } catch (error) {
    res.status(500).json({ message: "Error saving/unsaving property" });
  }
});

// Get all properties for a landlord
router.get("/landlord", auth, checkRole(["landlord"]), async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.user._id }).populate(
      "reviews"
    );
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: "Error fetching landlord properties" });
  }
});

// Get analytics for landlord dashboard
router.get(
  "/landlord/analytics",
  auth,
  checkRole(["landlord"]),
  async (req, res) => {
    try {
      const properties = await Property.find({ landlord: req.user._id });
      const totalProperties = properties.length;
      const totalRevenue = properties.reduce(
        (sum, p) => sum + (p.price || 0),
        0
      );
      const rented = properties.filter((p) => p.status === "rented").length;
      const occupancyRate =
        totalProperties > 0 ? Math.round((rented / totalProperties) * 100) : 0;
      // Example: InRent fees = 5% of total revenue
      const inrentFees = Math.round(totalRevenue * 0.05);
      res.json({
        totalProperties,
        totalRevenue,
        occupancyRate,
        inrentFees,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching analytics" });
    }
  }
);

module.exports = router;
