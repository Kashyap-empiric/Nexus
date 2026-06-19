import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.SUPABASE_URL = "https://test-project.supabase.co";

vi.mock("@/utils/jwt.js", () => ({
  verifyToken: vi.fn(),
}));

const { authMiddleware } = await import("@/middlewares/auth.js");
const { verifyToken } = await import("@/utils/jwt.js");

describe("authMiddleware", () => {
  let req: any, res: any, next: any;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("attaches user to req when token is valid", async () => {
    req.headers = { authorization: "Bearer valid-token" };
    vi.mocked(verifyToken).mockResolvedValueOnce({ id: "user-123" });

    await authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: "user-123" });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header is missing", async () => {
    req.headers = {};

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Missing") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when auth header does not start with Bearer", async () => {
    req.headers = { authorization: "Basic abc123" };

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    req.headers = { authorization: "Bearer bad-token" };
    vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Invalid token"));

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid or expired token" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired", async () => {
    req.headers = { authorization: "Bearer expired-token" };
    vi.mocked(verifyToken).mockRejectedValueOnce(new Error("JWT expired"));

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("handles missing token part after Bearer", async () => {
    req.headers = { authorization: "Bearer " };

    vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Invalid token"));

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
