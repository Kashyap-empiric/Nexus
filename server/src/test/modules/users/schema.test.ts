import { describe, it, expect } from "vitest";

const {
  updateProfileSchema,
  searchUsersQuerySchema,
  updateStatusSchema,
  updateAvatarSchema,
} = await import("@/modules/users/users.schema.js");

describe("users schemas", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid profile update", () => {
      const result = updateProfileSchema.parse({
        username: "alice_new",
        fullName: "Alice Smith",
        bio: "Hello world",
      });
      expect(result.username).toBe("alice_new");
    });

    it("accepts partial update with only one field", () => {
      const result = updateProfileSchema.parse({ fullName: "Alice" });
      expect(result.fullName).toBe("Alice");
    });

    it("rejects username that is too short", () => {
      expect(() => updateProfileSchema.parse({ username: "ab" })).toThrow();
    });
  });

  describe("searchUsersQuerySchema", () => {
    it("accepts valid search query", () => {
      const result = searchUsersQuerySchema.parse({ q: "ali" });
      expect(result.q).toBe("ali");
    });

    it("defaults to empty string when not provided", () => {
      const result = searchUsersQuerySchema.parse({});
      expect(result.q).toBe("");
    });
  });

  describe("updateStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateStatusSchema.parse({ status: "AWAY" });
      expect(result.status).toBe("AWAY");
    });

    it("accepts status with text", () => {
      const result = updateStatusSchema.parse({
        status: "DND",
        statusText: "In a meeting",
      });
      expect(result.statusText).toBe("In a meeting");
    });

    it("rejects invalid status", () => {
      expect(() => updateStatusSchema.parse({ status: "INVALID" })).toThrow();
    });
  });

  describe("updateAvatarSchema", () => {
    it("accepts valid avatar URL", () => {
      const result = updateAvatarSchema.parse({
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("accepts null avatarUrl (remove avatar)", () => {
      const result = updateAvatarSchema.parse({ avatarUrl: null });
      expect(result.avatarUrl).toBeNull();
    });
  });
});
