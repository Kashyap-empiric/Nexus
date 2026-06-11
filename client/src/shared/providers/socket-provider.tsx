"use client";

import { useEffect, useMemo } from "react";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { useSocketEvents } from "@/shared/hooks/useSocketEvent";
import { useChatStore } from "@/modules/chat";
import { toast } from "sonner";

export function SocketProvider() {
  const setSocketStatus = useChatStore((state) => state.setSocketStatus);

  const events = useMemo(() => {
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

    return {
      "connect": onConnect,
      "disconnect": onDisconnect,
      "connect_error": onConnectError,
      [SOCKET_EVENTS.INITIAL_PRESENCE]: handleInitialPresence,
      [SOCKET_EVENTS.USER_ONLINE]: handleUserOnline,
      [SOCKET_EVENTS.USER_OFFLINE]: handleUserOffline,
    };
  }, [setSocketStatus]);

  useSocketEvents(events);

  useEffect(() => {
    if (socket.connected) {
      setSocketStatus("connected");
    } else {
      socket.connect();
    }
  }, [setSocketStatus]);

  return null;
}
