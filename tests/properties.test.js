const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Property Endpoints", () => {
  let token;
  let propertyId;
  const testUserData = {
    email: `landlord${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Landlord User",
  };
  const testProperty = {
    title: "Test Property",
    description: "A great place to stay!",
    address: "123 Main St, Gaborone",
    rentAmount: 3500,
    isAvailable: true,
  };

  beforeAll(async () => {
    // Clean up if user exists
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    // Register and login landlord
    await request(app).post("/api/auth/register").send(testUserData);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserData.email, password: testUserData.password });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { title: testProperty.title } });
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await prisma.$disconnect();
  });

  it("should allow a landlord to create a property", async () => {
    const res = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${token}`)
      .send(testProperty);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe(testProperty.title);
    propertyId = res.body.id;
  });

  it("should fetch all available properties", async () => {
    const res = await request(app).get("/api/properties");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p) => p.title === testProperty.title)).toBe(true);
  });

  it("should not allow a non-landlord to create a property", async () => {
    // Register a student
    const studentData = {
      email: `student${Date.now()}@example.com`,
      password: "TestPassword123!",
      role: "STUDENT",
      name: "Student User",
    };
    await request(app).post("/api/auth/register").send(studentData);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: studentData.email, password: studentData.password });
    const studentToken = loginRes.body.token;
    const res = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${studentToken}`)
      .send(testProperty);
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });
});
