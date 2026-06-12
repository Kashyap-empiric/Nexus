import type { Server, Socket } from "socket.io";
import { isWorkspaceMember } from "@/shared/permissions.js";
import * as conversationsRepo from "@/modules/conversations/conversations.repository.js";

export const registerWorkspaceHandlers = (io: Server, socket: Socket) => {
  socket.on(
    "workspace:join",
    async (
      payload: { workspaceId: string },
      callback
    ) => {
      try {
        const userId = socket.data.user?.id;
        if (!userId) return callback?.({ success: false });

        const isMember = await isWorkspaceMember(userId, payload.workspaceId);
        if (!isMember) return callback?.({ success: false });

        // Leave previous workspace rooms
        socket.rooms.forEach((room) => {
          if (room.startsWith("conversation:") && socket.data.activeWorkspaceRooms?.includes(room)) {
            socket.leave(room);
          }
        });

        // Join new workspace channels
        const channels = await conversationsRepo.findChannelIdsByWorkspaceId(payload.workspaceId);

        const newRooms = channels.map(c => `conversation:${c.id}`);
        if (newRooms.length > 0) {
            await socket.join(newRooms);
        }

        socket.data.activeWorkspaceRooms = newRooms;

        return callback?.({ success: true });
      } catch (error) {
        console.error("[Socket.io workspace:join]", error);
        return callback?.({ success: false });
      }
    }
  );
};
