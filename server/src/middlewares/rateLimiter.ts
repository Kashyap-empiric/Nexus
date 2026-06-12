import type { Request, Response, NextFunction } from "express";
import { ENV } from "@/config/env.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
};

type ClientHit = {
  count: number;
  resetAt: number;
};

const createRateLimiter = ({ windowMs, max, message }: RateLimitOptions) => {
  const hits = new Map<string, ClientHit>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientKey = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const current = hits.get(clientKey);

    if (!current || current.resetAt <= now) {
      hits.set(clientKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
};

export const generalLimiter = createRateLimiter({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX,
  message: "Too many requests. Please try again later.",
});

export const messageLimiter = createRateLimiter({
  windowMs: ENV.MESSAGE_RATE_LIMIT_WINDOW_MS,
  max: ENV.MESSAGE_RATE_LIMIT_MAX,
  message: "You are sending messages too quickly.",
});
