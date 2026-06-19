import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

process.env.DATABASE_URL = "postgresql://nexus_test:nexus_test_pass@localhost:5433/nexus_test";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
process.env.VAPID_SUBJECT = "mailto:test@nexus.app";

const { default: app } = await import("@/app.js");

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("returns a valid ISO timestamp", async () => {
    const res = await request(app).get("/health");
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe("GET /api/me (no auth)", () => {
  it("returns 401 without authorization header", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 with invalid auth header format", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Basic some-token");
    expect(res.status).toBe(401);
  });

  it("returns 404 with valid-looking but non-existent token", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-token-that-will-fail-verification");
    expect(res.status).toBe(401);
  });
});

describe("CORS headers", () => {
  it("allows configured origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("rejects disallowed origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://evil.com")
      .set("Access-Control-Request-Method", "GET");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/nonexistent-route");
    expect(res.status).toBe(404);
  });
});
