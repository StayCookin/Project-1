const prisma = require("../utils/prisma");

// POST /api/inquiries - Student submits an inquiry to a landlord about a property
const createInquiry = async (req, res) => {
  const { propertyId, message } = req.body;
  const studentId = req.user.id;
  if (!propertyId || !message) {
    return res
      .status(400)
      .json({ error: "Property ID and message are required." });
  }
  try {
    // Find the property and its landlord
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { landlord: true },
    });
    if (!property) {
      return res.status(404).json({ error: "Property not found." });
    }
    // Create the inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId,
        studentId,
        landlordId: property.landlordId,
        message,
      },
      include: {
        property: true,
        landlord: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    res.status(201).json(inquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// GET /api/inquiries/landlord - Landlord views all inquiries sent to them
const getLandlordInquiries = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { landlordId },
      include: {
        property: true,
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    res.status(200).json(inquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

// GET /api/inquiries/student - Student views all their inquiries
const getStudentInquiries = async (req, res) => {
  const studentId = req.user.id;
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { studentId },
      include: {
        property: true,
        landlord: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    res.status(200).json(inquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

module.exports = {
  createInquiry,
  getLandlordInquiries,
  getStudentInquiries,
};
