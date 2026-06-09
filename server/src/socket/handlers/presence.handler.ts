import type { Server, Socket } from "socket.io";
import { presenceStore } from "../presenceStore.js";
import { SOCKET_EVENTS } from "../../shared/socket-events";

export const registerPresenceHandlers = async (io: Server, socket: Socket) => {
  const userId = socket.data.user?.id;
  if (!userId) return;

  // --- Register disconnect handler FIRST (synchronously) ---
  // This must be attached before any await so it always catches rapid
  // disconnects (e.g. page refresh) while Redis ops are still in flight.
  socket.on("disconnect", async () => {
    try {
      const isNowOffline = await presenceStore.removeSocket(userId, socket.id);

      if (isNowOffline) {
        // Use io.emit instead of socket.broadcast.emit because the socket
        // is already disconnecting — broadcasting via the server instance
        // is more reliable.
        io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
      }
    } catch (error) {
      console.error("[Socket.io] Presence disconnect error:", error);
    }
  });

  // --- Connect ---
  try {
    const isFirstConnection = await presenceStore.addSocket(userId, socket.id);

    if (isFirstConnection) {
      socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
    }

    const onlineUsers = await presenceStore.getOnlineUsers();
    socket.emit(SOCKET_EVENTS.INITIAL_PRESENCE, { userIds: onlineUsers });
  } catch (error) {
    console.error("[Socket.io] Presence connect error:", error);
  }
};
