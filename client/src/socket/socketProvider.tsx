"use client";

import { useEffect, useMemo } from "react";
import { socket } from "@/socket/socketClient";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { useSocketEvents } from "@/socket/useSocketEvent";
import { useSocketStore } from "@/socket/socketStore";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/shared/lib/notifications";

export function SocketProvider() {
  const setSocketStatus = useSocketStore((state) => state.setSocketStatus);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const events = useMemo(() => {
    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");
    const onConnectError = (error: Error) => {
      setSocketStatus("disconnected");
      toast.error(`Connection lost: ${error.message}`);
    };

    const handleInitialPresence = ({ userIds }: { userIds: string[] }) => {
      useSocketStore.getState().setInitialOnlineUsers(userIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      useSocketStore.getState().addUserOnline(userId);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      useSocketStore.getState().removeUserOffline(userId);
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
