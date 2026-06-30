import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { errorHandler } = await import("@/middlewares/errorHandler.js");

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

function mockReqRes() {
  const req: Partial<Request> = {};
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe("errorHandler middleware", () => {
  it("returns 500 with generic message for unknown errors", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Something broke");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("returns custom status code if set on error", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Not found") as ErrorWithStatusCode;
    err.statusCode = 404;

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
  });

  it("returns 400 for bad request errors", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Invalid input") as ErrorWithStatusCode;
    err.statusCode = 400;

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid input" });
  });

  it("does not leak internal error details for 500s", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Sensitive database details: connection refused on secret-host:5432");

    errorHandler(err, req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Sensitive") })
    );
  });

  it("logs 500 errors to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req, res, next } = mockReqRes();
    const err = new Error("Server crash");

    errorHandler(err, req as Request, res as Response, next);

    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", err);
    consoleSpy.mockRestore();
  });

  it("does not log non-500 errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req, res, next } = mockReqRes();
    const err = new Error("Bad request") as ErrorWithStatusCode;
    err.statusCode = 400;

    errorHandler(err, req as Request, res as Response, next);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles 403 forbidden", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Forbidden") as ErrorWithStatusCode;
    err.statusCode = 403;

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("handles 429 rate limited", () => {
    const { req, res, next } = mockReqRes();
    const err = new Error("Too many requests") as ErrorWithStatusCode;
    err.statusCode = 429;

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
