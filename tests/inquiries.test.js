const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Inquiry Endpoints", () => {
  let studentToken, landlordToken, propertyId;
  const studentData = {
    email: `student${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "STUDENT",
    name: "Student User",
  };
  const landlordData = {
    email: `landlord${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Landlord User",
  };
  const property = {
    title: "Inquiry Test Property",
    description: "A property for inquiry testing.",
    address: "123 Main St, Gaborone",
    rentAmount: 3500,
    isAvailable: true,
    bedrooms: 2,
    propertyType: "apartment",
  };

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [studentData.email, landlordData.email] } },
    });
    // Register and login landlord
    await request(app).post("/api/auth/register").send(landlordData);
    const landlordLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: landlordData.email, password: landlordData.password });
    landlordToken = landlordLogin.body.token;
    // Create property
    const propertyRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send(property);
    propertyId = propertyRes.body.id;
    // Register and login student
    await request(app).post("/api/auth/register").send(studentData);
    const studentLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: studentData.email, password: studentData.password });
    studentToken = studentLogin.body.token;
  });

  afterAll(async () => {
    await prisma.inquiry.deleteMany({});
    await prisma.property.deleteMany({ where: { title: property.title } });
    await prisma.user.deleteMany({
      where: { email: { in: [studentData.email, landlordData.email] } },
    });
    await prisma.$disconnect();
  });

  it("should allow a student to submit an inquiry", async () => {
    const res = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ propertyId, message: "Is this property still available?" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.property.id).toBe(propertyId);
    expect(res.body.student.email).toBe(studentData.email);
    expect(res.body.landlord.email).toBe(landlordData.email);
  });

  it("should not allow a landlord to submit an inquiry", async () => {
    const res = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ propertyId, message: "Fake inquiry" });
    expect(res.statusCode).toBe(403);
  });

  it("should allow a landlord to view all inquiries sent to them", async () => {
    const res = await request(app)
      .get("/api/inquiries/landlord")
      .set("Authorization", `Bearer ${landlordToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].landlord.email).toBe(landlordData.email);
  });

  it("should allow a student to view all their inquiries", async () => {
    const res = await request(app)
      .get("/api/inquiries/student")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].student.email).toBe(studentData.email);
  });
});
