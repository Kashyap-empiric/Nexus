import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { generalLimiter, messageLimiter } = await import("@/middlewares/rateLimiter.js");

describe("rate limiters", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { ip: "127.0.0.1", headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      on: vi.fn(),
      setHeader: vi.fn(),
    };
    next = vi.fn();
  });

  it("generalLimiter exists and calls next", async () => {
    await generalLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("messageLimiter exists and calls next", async () => {
    await messageLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
