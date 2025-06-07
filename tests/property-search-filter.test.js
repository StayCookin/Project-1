const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Property Search & Filter Endpoints", () => {
  let token;
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
      isAvailable: true,
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

  it("should filter properties by location", async () => {
    const res = await request(app).get("/api/properties?location=UB");
    expect(res.statusCode).toBe(200);
    expect(res.body.some((p) => p.title === "Modern Apartment near UB")).toBe(
      true
    );
  });

  it("should filter properties by minRent and maxRent", async () => {
    const res = await request(app).get(
      "/api/properties?minRent=3000&maxRent=4000"
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.some((p) => p.title === "Modern Apartment near UB")).toBe(
      true
    );
    expect(
      res.body.some((p) => p.title === "Luxury Apartment near Botho")
    ).toBe(false);
  });

  it("should filter properties by bedrooms", async () => {
    const res = await request(app).get("/api/properties?bedrooms=1");
    expect(res.statusCode).toBe(200);
    expect(res.body.some((p) => p.title === "Cozy Studio near Baisago")).toBe(
      true
    );
    expect(res.body.some((p) => p.title === "Modern Apartment near UB")).toBe(
      false
    );
  });

  it("should filter properties by propertyType", async () => {
    const res = await request(app).get("/api/properties?propertyType=studio");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Cozy Studio near Baisago");
  });

  it("should search properties by keyword", async () => {
    const res = await request(app).get("/api/properties?keyword=luxury");
    expect(res.statusCode).toBe(200);
    expect(
      res.body.some((p) => p.title === "Luxury Apartment near Botho")
    ).toBe(true);
  });
});
