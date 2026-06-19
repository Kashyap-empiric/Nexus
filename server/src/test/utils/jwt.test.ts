import { describe, it, expect, vi } from "vitest";

// Set env before any imports
process.env.SUPABASE_URL = "https://test-project.supabase.co";

// Mock jose entirely since verifyToken calls createRemoteJWKSet at module scope
const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: mockJwtVerify,
  errors: {},
}));

const { verifyToken } = await import("@/utils/jwt.js");

describe("verifyToken", () => {
  it("returns user id for a valid token", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: "user-123" },
      protectedHeader: { alg: "RS256" },
    });

    const result = await verifyToken("valid-token");
    expect(result).toEqual({ id: "user-123" });
  });

  it("throws if payload has no sub", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {},
      protectedHeader: { alg: "RS256" },
    });

    await expect(verifyToken("token-no-sub")).rejects.toThrow("Invalid token: missing subject");
  });

  it("throws on invalid signature", async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error("bad signature"));

    await expect(verifyToken("bad-token")).rejects.toThrow();
  });

  it("throws on expired token", async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error("token expired"));

    await expect(verifyToken("expired-token")).rejects.toThrow();
  });
});
