import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { socketAuthMiddleware } from "./middlewares/auth.js";
import { socketRateLimiterMiddleware } from "./middlewares/rateLimiter.js";
import { registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { prisma } from "@/lib/db.js";
import { ENV } from "@/config/env.js";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: ENV.ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true, // Consider adding if using cookies/sessions
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    // Apply rate limiting immediately
    socket.use(socketRateLimiterMiddleware(socket));

    const userId = socket.data.user?.id;

    console.log(`[Socket.io] connected: socket=${socket.id} user=${userId}`);

    socket.on("error", (err) => {
      console.error(
        `[Socket.io] runtime error: socket=${socket.id} user=${userId}`,
        err
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] disconnected user=${userId || 'unknown'} reason=${reason}`);
    });

    try {
      if (userId) {
        // Join user-specific room for targeted messages
        await socket.join(`user:${userId}`);

        const memberships = await prisma.conversationMember.findMany({
          where: { userId },
          select: { conversationId: true },
        });

        const rooms = memberships.map(
          (m) => `conversation:${m.conversationId}`
        );

        if (rooms.length > 0) {
          await socket.join(rooms);
          console.log(`[Socket.io] socket=${socket.id} joined ${rooms.length} rooms`);
        }
      }

      socket.data.session = {
        userId,
        connectedAt: Date.now(),
      };

      registerPresenceHandlers(io, socket);
      registerMessageHandlers(io, socket);
    } catch (err) {
      console.error("[Socket.io] failed to setup connection:", err);
      socket.disconnect(true);
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};