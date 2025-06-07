const request = require("supertest");
const app = require("../backend/server");
const prisma = require("../backend/utils/prisma");

describe("Authentication Endpoints", () => {
  let testUser;
  let token;
  const testUserData = {
    email: "testuser@example.com",
    password: "TestPassword123!",
    role: "LANDLORD",
    name: "Test User",
  };

  beforeAll(async () => {
    // Clean up if user exists
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUserData.email } });
    await prisma.$disconnect();
  });

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUserData);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(testUserData.email);
  });

  it("should login the user and return a JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUserData.email, password: testUserData.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testUserData.email);
    token = res.body.token;
  });

  it("should fetch the current user profile with a valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(testUserData.email);
    expect(res.body).not.toHaveProperty("password");
  });

  it("should return 401 if no token is provided to /me", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Please authenticate.");
  });
});
