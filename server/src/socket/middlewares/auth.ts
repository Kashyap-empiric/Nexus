import type { Socket } from "socket.io";
import { verifyToken } from "@/utils/jwt.js";

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
    
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    
    const user = await verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error: any) {
    console.error("[Socket.io Auth] Authentication failed:", error);
    next(new Error(error.message?.includes("token") ? "Authentication error: Invalid token" : "Authentication Service Unavailable"));
  }
};
