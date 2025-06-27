const prisma = require("../utils/prisma");

// --- CREATE A NEW PROPERTY LISTING ---
const createProperty = async (req, res) => {
  const { title, description, address, rentAmount, isAvailable } = req.body;

  // The logged-in user's ID is available from the 'auth' middleware
  const landlordId = req.user.id;

  // Basic validation
  if (!title || !description || !address || !rentAmount) {
    return res.status(400).json({
      error:
        "All fields (title, description, address, rentAmount) are required.",
    });
  }

  try {
    const newProperty = await prisma.property.create({
      data: {
        title,
        description,
        address,
        rentAmount,
        isAvailable,
        // Link the property to the landlord who created it
        landlord: {
          connect: {
            id: landlordId,
          },
        },
      },
    });

    res.status(201).json(newProperty); // 201 Created
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// --- GET ALL PROPERTIES WITH ADVANCED SEARCH & FILTERING ---
const getAllProperties = async (req, res) => {
  const {
    search,
    minPrice,
    maxPrice,
    bedrooms,
    propertyType,
    isAvailable,
    landlordId,
    startDate,
    endDate,
  } = req.query;
  try {
    // Start with a base `where` clause
    const where = {};
    // Only available by default unless explicitly set
    if (typeof isAvailable === "undefined" || isAvailable === "true") {
      where.isAvailable = true;
    } else if (isAvailable === "false") {
      where.isAvailable = false;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice) {
      where.rentAmount = { ...where.rentAmount, gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      where.rentAmount = { ...where.rentAmount, lte: parseInt(maxPrice) };
    }
    if (bedrooms) {
      where.bedrooms = parseInt(bedrooms);
    }
    if (propertyType) {
      where.propertyType = propertyType;
    }
    if (landlordId) {
      where.landlordId = landlordId;
    }
    // Optional: filter by creation date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    // --- AMENITIES FILTER (multi) ---
    if (Array.isArray(req.query.amenity)) {
      // Multiple amenities: all must be present
      where.AND = req.query.amenity.map((a) => ({ amenities: { has: a } }));
    } else if (req.query.amenity) {
      // Single amenity
      where.amenities = { has: req.query.amenity };
    }
    const properties = await prisma.property.findMany({
      where,
      include: {
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    res.status(200).json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// --- GET A SINGLE PROPERTY BY ITS ID ---
const getPropertyById = async (req, res) => {
  // Get the property ID from the URL parameters
  const { id } = req.params;

  try {
    const property = await prisma.property.findUnique({
      where: {
        id: id,
      },
      // Also include the landlord's public information
      include: {
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // If no property with that ID is found, send a 404 error
    if (!property) {
      return res.status(404).json({ error: "Property not found." });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// --- UPDATE A PROPERTY LISTING (LANDLORD ONLY) ---
const updateProperty = async (req, res) => {
  const { id } = req.params;
  const landlordId = req.user.id;
  const { title, description, address, rentAmount, isAvailable } = req.body;

  try {
    // Ensure the property exists and belongs to the logged-in landlord
    const property = await prisma.property.findUnique({
      where: { id },
    });
    if (!property || property.landlordId !== landlordId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to update this property." });
    }
    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { title, description, address, rentAmount, isAvailable },
    });
    res.status(200).json(updatedProperty);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// --- DELETE A PROPERTY LISTING (LANDLORD ONLY) ---
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  const landlordId = req.user.id;
  try {
    // Ensure the property exists and belongs to the logged-in landlord
    const property = await prisma.property.findUnique({
      where: { id },
    });
    if (!property || property.landlordId !== landlordId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this property." });
    }
    await prisma.property.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
};
