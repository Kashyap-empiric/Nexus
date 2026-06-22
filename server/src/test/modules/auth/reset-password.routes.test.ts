import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { setupPrismaMock, mockPrisma, resetPrismaMock } from "../../mock-db.js";

process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.SENDGRID_API_KEY = "test-sendgrid-key";

setupPrismaMock();

// Mock the service functions to isolate route logic
vi.mock("@/modules/auth/reset-password.service.js", () => ({
  generateResetToken: vi.fn(),
  verifyResetToken: vi.fn(),
  completePasswordReset: vi.fn(),
}));

// Mock the email service
vi.mock("@/lib/email.js", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

const resetPasswordRoutes = (await import(
  "@/modules/auth/reset-password.routes.js"
)).default;
const { generateResetToken, verifyResetToken, completePasswordReset } =
  await import("@/modules/auth/reset-password.service.js");
const { sendPasswordResetEmail } = await import("@/lib/email.js");

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", resetPasswordRoutes);
  return app;
}

describe("POST /api/auth/forgot-password", () => {
  let app: express.Express;

  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    app = createTestApp();
  });

  it("returns 200 and sends email when user exists", async () => {
    vi.mocked(generateResetToken).mockResolvedValueOnce("raw-token-123");
    vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "alice@example.com",
    } as any);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "alice@example.com" })
      .expect(200);

    expect(res.body).toEqual({
      message: "If that email exists, a reset link has been sent.",
    });
    expect(generateResetToken).toHaveBeenCalledWith("user-1");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "alice@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=raw-token-123",
    });
  });

  it("returns 200 without sending email when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent@example.com" })
      .expect(200);

    expect(res.body).toEqual({
      message: "If that email exists, a reset link has been sent.",
    });
    expect(generateResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with generic message on server error (prevents enumeration)", async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "alice@example.com" })
      .expect(200);

    expect(res.body).toEqual({
      message: "If that email exists, a reset link has been sent.",
    });
  });

  it("returns 200 with generic message for invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" })
      .expect(200);

    expect(res.body).toEqual({
      message: "If that email exists, a reset link has been sent.",
    });
  });
});

describe("GET /api/auth/reset-password/verify", () => {
  let app: express.Express;

  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    app = createTestApp();
  });

  it("returns valid=true with email when token is valid", async () => {
    vi.mocked(verifyResetToken).mockResolvedValueOnce({
      userId: "user-1",
    });

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "alice@example.com",
    } as any);

    const res = await request(app)
      .get("/api/auth/reset-password/verify?token=valid-token-123")
      .expect(200);

    expect(res.body).toEqual({
      valid: true,
      email: "alice@example.com",
    });
    expect(verifyResetToken).toHaveBeenCalledWith("valid-token-123");
  });

  it("returns valid=false when token is invalid", async () => {
    vi.mocked(verifyResetToken).mockResolvedValueOnce(null);

    const res = await request(app)
      .get("/api/auth/reset-password/verify?token=invalid-token")
      .expect(200);

    expect(res.body).toEqual({ valid: false });
  });

  it("returns 400 when token is missing", async () => {
    const res = await request(app)
      .get("/api/auth/reset-password/verify")
      .expect(400);

    expect(res.body).toEqual({
      valid: false,
      error: "Token is required.",
    });
  });

  it("returns valid=false when verify throws", async () => {
    vi.mocked(verifyResetToken).mockRejectedValueOnce(new Error("Unexpected"));

    const res = await request(app)
      .get("/api/auth/reset-password/verify?token=some-token")
      .expect(200);

    expect(res.body).toEqual({ valid: false });
  });
});

describe("POST /api/auth/reset-password/complete", () => {
  let app: express.Express;

  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    app = createTestApp();
  });

  it("returns success=true when password is reset", async () => {
    vi.mocked(completePasswordReset).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/auth/reset-password/complete")
      .send({ token: "valid-token", newPassword: "new-password-123" })
      .expect(200);

    expect(res.body).toEqual({ success: true });
    expect(completePasswordReset).toHaveBeenCalledWith(
      "valid-token",
      "new-password-123",
    );
  });

  it("returns 400 when token is invalid/expired", async () => {
    vi.mocked(completePasswordReset).mockRejectedValueOnce(
      new Error("Invalid or expired reset token."),
    );

    const res = await request(app)
      .post("/api/auth/reset-password/complete")
      .send({ token: "bad-token", newPassword: "new-password-123" })
      .expect(400);

    expect(res.body).toEqual({ error: "Invalid or expired reset token." });
  });

  it("returns 400 when request body is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password/complete")
      .send({ token: "", newPassword: "short" })
      .expect(400);

    expect(res.body).toEqual({
      error:
        "Invalid request. Token and password (min 8 chars) are required.",
    });
  });

  it("returns 400 when token is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password/complete")
      .send({ newPassword: "new-password-123" })
      .expect(400);

    expect(res.body).toEqual({
      error:
        "Invalid request. Token and password (min 8 chars) are required.",
    });
  });
});
