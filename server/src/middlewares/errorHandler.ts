import type { ErrorRequestHandler } from "express";
import { AppError } from "@/lib/app-error.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : (err as any)?.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  if (statusCode === 500) {
    console.error("[ERROR]", err);
  }

  res.status(statusCode).json({ error: message });
};
