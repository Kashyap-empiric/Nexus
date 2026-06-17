"use client";

import { useEffect, useMemo } from "react";
import { socket } from "@/socket/socketClient";
import { SOCKET_EVENTS, type InitialPresencePayload } from "@/socket/socket-events";
import { useSocketEvents } from "@/socket/useSocketEvent";
import { useSocketStore } from "@/socket/socketStore";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/shared/lib/notifications";
import { useQueryClient } from "@tanstack/react-query";

export function SocketProvider() {
  const setSocketStatus = useSocketStore((state) => state.setSocketStatus);
  const queryClient = useQueryClient();

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

    const handleInitialPresence = (payload: InitialPresencePayload) => {
      useSocketStore.getState().setInitialOnlineUsers(payload.users.map((u: { userId: string }) => u.userId));
      // We could manually update cache here, but invalidating ensures fresh data
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    };

    const handleUserStatusUpdate = () => {
      // Invalidate relevant queries when someone's status changes
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleUserUpdate = () => {
      // Invalidate queries when someone's profile/avatar changes
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
      [SOCKET_EVENTS.USER_STATUS_UPDATE as string]: handleUserStatusUpdate,
      [SOCKET_EVENTS.USER_UPDATE as string]: handleUserUpdate,
    };
  }, [setSocketStatus]);

  useSocketEvents(events);

  useEffect(() => {
    if (socket.connected) {
      setSocketStatus("connected");
    } else {
      socket.connect();
    }
    
    return () => {
      socket.disconnect();
    };
  }, [setSocketStatus]);

  return null;
}
