import { describe, it, expect, vi, beforeEach } from "vitest";

const { generalLimiter, messageLimiter } = await import("@/middlewares/rateLimiter.js");

describe("rate limiters", () => {
  let req: any, res: any, next: any;

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      on: vi.fn(),
      setHeader: vi.fn(),
    };
    next = vi.fn();
  });

  it("generalLimiter exists and calls next", async () => {
    await generalLimiter(req, res, next);
    // In-memory rate limiter allows the first request
    expect(next).toHaveBeenCalled();
  });

  it("messageLimiter exists and calls next", async () => {
    await messageLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
