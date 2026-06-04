import type { ErrorRequestHandler } from "express";

// Central error shape — every error response in the app uses this structure.
interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  if (statusCode === 500) {
    // Log the real error server-side but never expose internals to the client.
    console.error("[ERROR]", err);
  }

  res.status(statusCode).json({ error: message });
};
