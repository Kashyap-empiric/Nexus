import type { Socket } from "socket.io";
import { verifyToken } from "@/utils/jwt";
import { SOCKET_AUTH_ERRORS } from "../socketErrors"; // adjust path as needed

interface AuthError extends Error {
  code?: string;
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: AuthError) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1] ||
      socket.handshake.query?.token;

    if (!token) {
      const err: AuthError = new Error("Authentication token missing");
      err.code = SOCKET_AUTH_ERRORS.TOKEN_MISSING;
      return next(err);
    }

    const user = await verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error: any) {
    let errorCode = SOCKET_AUTH_ERRORS.AUTH_SERVICE_ERROR;

    if (error?.name === "JsonWebTokenError") {
      errorCode = SOCKET_AUTH_ERRORS.TOKEN_INVALID;
    } else if (error?.name === "TokenExpiredError") {
      errorCode = SOCKET_AUTH_ERRORS.TOKEN_INVALID;
    }

    const authError: AuthError = new Error("Authentication failed");
    authError.code = errorCode;
    return next(authError);
  }
};