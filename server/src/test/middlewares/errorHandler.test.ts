import { describe, it, expect, vi } from "vitest";

const { errorHandler } = await import("@/middlewares/errorHandler.js");

function mockReqRes() {
  const req: any = {};
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("errorHandler middleware", () => {
  it("returns 500 with generic message for unknown errors", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Something broke");

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("returns custom status code if set on error", () => {
    const { req, res, next } = mockReqRes();
    const err: any = new Error("Not found");
    err.statusCode = 404;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
  });

  it("returns 400 for bad request errors", () => {
    const { req, res, next } = mockReqRes();
    const err: any = new Error("Invalid input");
    err.statusCode = 400;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid input" });
  });

  it("does not leak internal error details for 500s", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Sensitive database details: connection refused on secret-host:5432");

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Sensitive") })
    );
  });

  it("logs 500 errors to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req, res, next } = mockReqRes();
    const err = new Error("Server crash");

    errorHandler(err, req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", err);
    consoleSpy.mockRestore();
  });

  it("does not log non-500 errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req, res, next } = mockReqRes();
    const err: any = new Error("Bad request");
    err.statusCode = 400;

    errorHandler(err, req, res, next);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles 403 forbidden", () => {
    const { req, res, next } = mockReqRes();
    const err: any = new Error("Forbidden");
    err.statusCode = 403;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("handles 429 rate limited", () => {
    const { req, res, next } = mockReqRes();
    const err: any = new Error("Too many requests");
    err.statusCode = 429;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
