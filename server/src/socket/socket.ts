import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { socketAuthMiddleware } from "./middlewares/auth.js";
import { registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { prisma } from "@/lib/db.js";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"]
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id} (User: ${socket.data.user?.id})`);

    // Auto-Join Rooms
    try {
      if (socket.data.user?.id) {
        const memberships = await prisma.conversationMember.findMany({
          where: { userId: socket.data.user.id },
          select: { conversationId: true }
        });

        const rooms = memberships.map(m => `conversation:${m.conversationId}`);
        if (rooms.length > 0) {
          socket.join(rooms);
          console.log(`[Socket.io] Socket ${socket.id} auto-joined ${rooms.length} rooms`);
        }
      }
    } catch (err) {
      console.error("[Socket.io] Failed to auto-join rooms:", err);
    }

    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};
