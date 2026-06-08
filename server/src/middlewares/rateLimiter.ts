import type { Request, Response, NextFunction } from "express";

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
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX ?? 1000),
  message: "Too many requests. Please try again later.",
});

export const messageLimiter = createRateLimiter({
  windowMs: Number(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  max: Number(process.env.MESSAGE_RATE_LIMIT_MAX ?? 20),
  message: "You are sending messages too quickly.",
});
