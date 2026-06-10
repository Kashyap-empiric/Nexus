"use client";

import { useEffect } from "react";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { useChatStore } from "@/modules/chat";
import { toast } from "sonner";

export function SocketProvider() {
  const setSocketStatus = useChatStore((state) => state.setSocketStatus);

  useEffect(() => {
    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");
    const onConnectError = (error: Error) => {
      setSocketStatus("disconnected");
      toast.error(`Connection lost: ${error.message}`);
    };

    const handleInitialPresence = ({ userIds }: { userIds: string[] }) => {
      useChatStore.getState().setInitialOnlineUsers(userIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      useChatStore.getState().addUserOnline(userId);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      useChatStore.getState().removeUserOffline(userId);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on(SOCKET_EVENTS.INITIAL_PRESENCE, handleInitialPresence);
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);

    if (socket.connected) {
      setSocketStatus("connected");
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off(SOCKET_EVENTS.INITIAL_PRESENCE, handleInitialPresence);
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline);
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline);
    };
  }, [setSocketStatus]);

  return null;
}
