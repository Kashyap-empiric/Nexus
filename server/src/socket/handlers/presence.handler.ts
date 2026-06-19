import type { Server, Socket } from "socket.io";
import { presenceStore } from "../presenceStore.js";
import { SOCKET_EVENTS } from "../../shared/socket-events.js";
import type { InitialPresencePayload } from "../../shared/socket-events.js";
import { dispatchUserPresence } from "../socket.dispatcher.js";
import { prisma } from "../../lib/db.js";

export const registerPresenceHandlers = async (io: Server, socket: Socket) => {
  const userId = socket.data.user?.id;
  if (!userId) return;

  socket.on("disconnect", async () => {
    try {
      const isNowOffline = await presenceStore.removeSocket(userId, socket.id);

      if (isNowOffline) {
        dispatchUserPresence("OFFLINE", userId);
      }
    } catch (error) {
      console.error("[Socket.io] Presence disconnect error:", error);
    }
  });

  try {
    const isFirstConnection = await presenceStore.addSocket(userId, socket.id);

    if (isFirstConnection) {
      dispatchUserPresence("ONLINE", userId, socket);
    }

    const onlineUsers = await presenceStore.getOnlineUsers();
    const onlineIds = Array.from(onlineUsers);
    
    const usersWithStatus = await prisma.user.findMany({
      where: { id: { in: onlineIds } },
      select: { id: true, status: true }
    });
    const statusesMap = new Map(usersWithStatus.map(u => [u.id, u.status]));
    const payload = onlineIds.map(id => ({ 
      userId: id, 
      status: statusesMap.get(id) || "AVAILABLE" 
    }));

    const initialPresence: InitialPresencePayload = { users: payload };
    dispatchUserPresence("INITIAL", initialPresence, socket);
  } catch (error) {
    console.error("[Socket.io] Presence connect error:", error);
  }
};
