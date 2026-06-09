import type { Server, Socket } from "socket.io";
import { redis } from "../../lib/redis";
import { SOCKET_EVENTS } from "../../shared/socket-events";

export const registerPresenceHandlers = async (io: Server, socket: Socket) => {
  const userId = socket.data.user?.id;
  if (!userId) return;

  try {
    const localSetKey = `user:presence:${userId}`;
    await redis.sAdd(localSetKey, socket.id);

    const added = await redis.sAdd("presence:users", userId);
    if (added === 1) {
      socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
    }

    const onlineUsers = await redis.sMembers("presence:users");
    socket.emit(SOCKET_EVENTS.INITIAL_PRESENCE, { userIds: onlineUsers });
  } catch (error) {
    console.error("[Socket.io] Presence connect error:", error);
  }

  socket.on("disconnect", async () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (User: ${userId})`);
    try {
      const localSetKey = `user:presence:${userId}`;
      await redis.sRem(localSetKey, socket.id);
      const size = await redis.sCard(localSetKey);

      if (size === 0) {
        await redis.del(localSetKey);
        await redis.sRem("presence:users", userId);
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
        await redis.set(`user:lastSeen:${userId}`, Date.now().toString());
      }
    } catch (error) {
      console.error("[Socket.io] Presence disconnect error:", error);
    }
  });
};
