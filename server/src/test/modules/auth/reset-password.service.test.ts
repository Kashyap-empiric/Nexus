import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupPrismaMock, mockPrisma, resetPrismaMock } from "../../mock-db.js";

process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

setupPrismaMock();

// Shared mock for the Admin API — defined at top level so all createClient() calls
// return an object sharing the same mocked updateUserById.
const mockUpdateUserById = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}));

const resetPasswordService = await import(
  "@/modules/auth/reset-password.service.js"
);

describe("reset-password service", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  describe("generateResetToken", () => {
    it("creates a token record and returns the raw token", async () => {
      const fakeRecord = {
        id: "record-1",
        userId: "user-1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
      };

      mockPrisma.passwordResetToken.create.mockResolvedValueOnce(
        fakeRecord as any,
      );

      const rawToken = await resetPasswordService.generateResetToken("user-1");

      // Returns a 64-character hex string (32 bytes)
      expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

      // Verifies it was stored with the correct shape
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe("verifyResetToken", () => {
    it("returns userId for a valid token", async () => {
      const future = new Date(Date.now() + 3600_000);
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: "record-1",
        userId: "user-1",
        tokenHash: "some-hash",
        expiresAt: future,
        usedAt: null,
      } as any);

      const result = await resetPasswordService.verifyResetToken(
        "valid-token",
      );

      expect(result).toEqual({ userId: "user-1" });
    });

    it("returns null when token is not found", async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);

      const result = await resetPasswordService.verifyResetToken(
        "nonexistent-token",
      );

      expect(result).toBeNull();
    });

    it("returns null when token has expired", async () => {
      const past = new Date(Date.now() - 3600_000);
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: "record-1",
        userId: "user-1",
        tokenHash: "some-hash",
        expiresAt: past,
        usedAt: null,
      } as any);

      const result = await resetPasswordService.verifyResetToken(
        "expired-token",
      );

      expect(result).toBeNull();
    });

    it("returns null when token has already been used", async () => {
      const future = new Date(Date.now() + 3600_000);
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);

      const result = await resetPasswordService.verifyResetToken(
        "used-token",
      );

      // The query filters by usedAt: null, so the record won't be found
      expect(result).toBeNull();
      expect(mockPrisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), usedAt: null },
      });
    });
  });

  describe("completePasswordReset", () => {
    it("updates password via admin API and invalidates token", async () => {
      const future = new Date(Date.now() + 3600_000);
      const record = {
        id: "record-1",
        userId: "user-1",
        tokenHash: "some-hash",
        expiresAt: future,
        usedAt: null,
      };

      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce(
        record as any,
      );

      // The shared mock — all createClient() calls share the same function
      mockUpdateUserById.mockResolvedValueOnce({ error: null });

      mockPrisma.passwordResetToken.update.mockResolvedValueOnce({
        ...record,
        usedAt: new Date(),
      } as any);

      await resetPasswordService.completePasswordReset(
        "valid-token",
        "new-password-123",
      );

      // Admin API was called with correct userId and password
      expect(mockUpdateUserById).toHaveBeenCalledWith("user-1", {
        password: "new-password-123",
      });

      // Token was invalidated
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: "record-1" },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("throws when token is not found", async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);

      await expect(
        resetPasswordService.completePasswordReset(
          "invalid-token",
          "new-password-123",
        ),
      ).rejects.toThrow("Invalid or expired reset token.");
    });

    it("throws when token has expired", async () => {
      const past = new Date(Date.now() - 3600_000);
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: "record-1",
        userId: "user-1",
        tokenHash: "some-hash",
        expiresAt: past,
        usedAt: null,
      } as any);

      await expect(
        resetPasswordService.completePasswordReset(
          "expired-token",
          "new-password-123",
        ),
      ).rejects.toThrow("Reset token has expired.");
    });

    it("throws when admin API returns an error", async () => {
      const future = new Date(Date.now() + 3600_000);
      mockPrisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: "record-1",
        userId: "user-1",
        tokenHash: "some-hash",
        expiresAt: future,
        usedAt: null,
      } as any);

      mockUpdateUserById.mockResolvedValueOnce({
        error: new Error("User not found"),
      });

      await expect(
        resetPasswordService.completePasswordReset(
          "valid-token",
          "new-password-123",
        ),
      ).rejects.toThrow("Failed to update password. Please try again.");
    });
  });
});
