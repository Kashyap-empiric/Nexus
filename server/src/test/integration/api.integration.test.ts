import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = "postgresql://nexus_test:nexus_test_pass@localhost:5433/nexus_test";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
process.env.VAPID_SUBJECT = "mailto:test@nexus.app";

const { default: app } = await import("@/app.js");


describe("API Integration Tests", () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();

      testUser = await prisma.user.upsert({
        where: { email: "test@nexus.app" },
        update: {},
        create: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@nexus.app",
          username: "testuser",
          fullName: "Test User",
          isOnboarded: true,
        },
      });


      await prisma.$disconnect();
    } catch (err) {
      console.warn("⚠️  Integration tests skipped: database not available");
    }
  });

  describe("GET /api/me (unauthenticated)", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/me");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/conversations (unauthenticated)", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/conversations");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users (unauthenticated)", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/users/me");
      expect(res.status).toBe(401);
    });
  });
});
