const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Property Advanced Filter Endpoints", () => {
  let token;
  let landlordId;
  const testUserData = {
    email: `landlord${Date.now()}@example.com`,
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Landlord User",
  };
  const testProperties = [
    {
      title: "Modern Apartment near UB",
      description: "Close to UB campus, 2 bedrooms, WiFi included.",
      address: "Gaborone, Near UB Campus",
      rentAmount: 3500,
      isAvailable: true,
      bedrooms: 2,
      propertyType: "apartment",
    },
    {
      title: "Cozy Studio near Baisago",
      description: "Studio apartment, perfect for students.",
      address: "Gaborone, Near Baisago Campus",
      rentAmount: 2800,
      isAvailable: false,
      bedrooms: 1,
      propertyType: "studio",
    },
    {
      title: "Luxury Apartment near Botho",
      description: "Spacious, 3 bedrooms, luxury amenities.",
      address: "Gaborone, Near Botho Campus",
      rentAmount: 4200,
      isAvailable: true,
      bedrooms: 3,
      propertyType: "apartment",
    },
  ];

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await request(app).post("/api/auth/register").send(testUserData);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserData.email, password: testUserData.password });
    token = loginRes.body.token;
    // Get landlordId
    const user = await prisma.user.findUnique({
      where: { email: testUserData.email },
    });
    landlordId = user.id;
    // Insert test properties
    for (const prop of testProperties) {
      await request(app)
        .post("/api/properties")
        .set("Authorization", `Bearer ${token}`)
        .send(prop);
    }
  });

  afterAll(async () => {
    await prisma.property.deleteMany({
      where: { title: { in: testProperties.map((p) => p.title) } },
    });
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await prisma.$disconnect();
  });

  it("should filter by isAvailable=false", async () => {
    const res = await request(app).get("/api/properties?isAvailable=false");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Cozy Studio near Baisago");
  });

  it("should filter by bedrooms=3", async () => {
    const res = await request(app).get("/api/properties?bedrooms=3");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Luxury Apartment near Botho");
  });

  it("should filter by propertyType=apartment", async () => {
    const res = await request(app).get(
      "/api/properties?propertyType=apartment"
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.some((p) => p.title === "Modern Apartment near UB")).toBe(
      true
    );
    expect(
      res.body.some((p) => p.title === "Luxury Apartment near Botho")
    ).toBe(true);
  });

  it("should filter by landlordId", async () => {
    const res = await request(app).get(
      `/api/properties?landlordId=${landlordId}`
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it("should filter by date range", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app).get(
      `/api/properties?startDate=${today}&endDate=${today}`
    );
    expect(res.statusCode).toBe(200);
    // Should return all properties created today
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
