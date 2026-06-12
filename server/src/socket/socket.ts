import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { socketAuthMiddleware } from "./middlewares/auth.js";
import { socketRateLimiterMiddleware } from "./middlewares/rateLimiter.js";
import { registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerWorkspaceHandlers } from "./handlers/workspace.handler.js";
import { ENV } from "@/config/env.js";
import { getUserConversationMemberships, getUserWorkspaceChannels, getUserWorkspaceIds } from "@/modules/auth/auth.service.js";

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

        const dmMemberships = await getUserConversationMemberships(userId);
        const channelMemberships = await getUserWorkspaceChannels(userId);

        const rooms = [
          ...dmMemberships.map((m) => `conversation:${m.conversationId}`),
          ...channelMemberships.map((c) => `conversation:${c.id}`)
        ];

        if (rooms.length > 0) {
          await socket.join(rooms);
          console.log(`[Socket.io] socket=${socket.id} joined ${rooms.length} conversation/channel rooms`);
        }

        // Join workspace rooms for broadcasts (channel:update, member:update, workspace:update)
        const workspaceIds = await getUserWorkspaceIds(userId);
        const workspaceRooms = workspaceIds.map((id) => `workspace:${id}`);
        if (workspaceRooms.length > 0) {
          await socket.join(workspaceRooms);
          console.log(`[Socket.io] socket=${socket.id} joined ${workspaceRooms.length} workspace rooms`);
        }
      }

      socket.data.session = {
        userId,
        connectedAt: Date.now(),
      };

      registerPresenceHandlers(io, socket);
      registerMessageHandlers(io, socket);
      registerWorkspaceHandlers(io, socket);
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