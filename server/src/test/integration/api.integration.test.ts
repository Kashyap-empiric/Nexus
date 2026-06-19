import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

// Set env before imports
process.env.DATABASE_URL = "postgresql://nexus_test:nexus_test_pass@localhost:5433/nexus_test";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
process.env.VAPID_SUBJECT = "mailto:test@nexus.app";

const { default: app } = await import("@/app.js");

// These integration tests require a running test database.
// Start it with: docker compose -f docker-compose.test.yml up -d
// Then run migrations: dotenv -e .env.test -- prisma migrate deploy

describe("API Integration Tests", () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // These tests require the database to be running and migrated.
    // If DATABASE_URL is not reachable, skip integration tests.
    try {
      const prisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
      });
      await prisma.$connect();

      // Seed a test user directly
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

      // We cannot get a real Supabase JWT without Supabase, so auth tests
      // need a mocked auth middleware. The integration tests here focus on
      // non-authenticated endpoints and basic app behavior.

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
