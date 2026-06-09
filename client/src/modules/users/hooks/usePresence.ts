import { useEffect } from "react";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { useChatStore } from "@/modules/chat/store/chatStore";

export const usePresence = () => {
  const { setInitialOnlineUsers, addUserOnline, removeUserOffline } = useChatStore();

  useEffect(() => {
    const handleInitialPresence = ({ userIds }: { userIds: string[] }) => {
      setInitialOnlineUsers(userIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      addUserOnline(userId);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      removeUserOffline(userId);
    };

    socket.on(SOCKET_EVENTS.INITIAL_PRESENCE, handleInitialPresence);
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);

    return () => {
      socket.off(SOCKET_EVENTS.INITIAL_PRESENCE, handleInitialPresence);
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
    };
  }, [setInitialOnlineUsers, addUserOnline, removeUserOffline]);
};
