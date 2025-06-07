const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Property Update & Delete Endpoints", () => {
  let token;
  let propertyId;
  const testUserData = {
    email: `landlord${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Landlord User",
  };
  const testProperty = {
    title: "Test Property UpdateDelete",
    description: "A great place to stay!",
    address: "123 Main St, Gaborone",
    rentAmount: 3500,
    isAvailable: true,
  };

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await request(app).post("/api/auth/register").send(testUserData);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserData.email, password: testUserData.password });
    token = loginRes.body.token;
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

  it("should update a property listing for the landlord", async () => {
    const updated = {
      ...testProperty,
      title: "Updated Title",
      rentAmount: 4000,
    };
    const res = await request(app)
      .put(`/api/properties/${propertyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated Title");
    expect(res.body.rentAmount).toBe(4000);
  });

  it("should not allow update by another landlord", async () => {
    const otherUser = {
      email: `otherlandlord${Date.now()}@example.com`,
      password: "TestPassword123!",
      role: "LANDLORD",
      name: "Other Landlord",
    };
    await request(app).post("/api/auth/register").send(otherUser);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: otherUser.email, password: otherUser.password });
    const otherToken = loginRes.body.token;
    const res = await request(app)
      .put(`/api/properties/${propertyId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hacked" });
    expect(res.statusCode).toBe(403);
  });

  it("should delete a property listing for the landlord", async () => {
    const res = await request(app)
      .delete(`/api/properties/${propertyId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(204);
  });

  it("should not allow delete by another landlord", async () => {
    // Re-create property for this test
    const propertyRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${token}`)
      .send(testProperty);
    const newPropertyId = propertyRes.body.id;
    const otherUser = {
      email: `otherlandlord2${Date.now()}@example.com`,
      password: "TestPassword123!",
      role: "LANDLORD",
      name: "Other Landlord 2",
    };
    await request(app).post("/api/auth/register").send(otherUser);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: otherUser.email, password: otherUser.password });
    const otherToken = loginRes.body.token;
    const res = await request(app)
      .delete(`/api/properties/${newPropertyId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.statusCode).toBe(403);
  });
});
