const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Property Details Endpoint", () => {
  let token;
  let propertyId;
  const testUserData = {
    email: `landlord${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Landlord User",
  };
  const testProperty = {
    title: "Test Property Details",
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
    // Create a property
    const propertyRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${token}`)
      .send(testProperty);
    propertyId = propertyRes.body.id;
  });

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { title: testProperty.title } });
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await prisma.$disconnect();
  });

  it("should fetch property details by ID", async () => {
    const res = await request(app).get(`/api/properties/${propertyId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", propertyId);
    expect(res.body).toHaveProperty("title", testProperty.title);
    expect(res.body).toHaveProperty("landlord");
    expect(res.body.landlord).toHaveProperty("id");
    expect(res.body.landlord).toHaveProperty("firstName");
    expect(res.body.landlord).toHaveProperty("lastName");
  });

  it("should return 404 for a non-existent property", async () => {
    const res = await request(app).get(`/api/properties/nonexistentid123`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "Property not found.");
  });
});
