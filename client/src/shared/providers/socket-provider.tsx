"use client";

import { useEffect } from "react";
import { socket } from "@/shared/lib/socket";
import { useChatStore } from "@/modules/chat";
import { toast } from "sonner";

export function SocketProvider() {
  const setSocketStatus = useChatStore((state) => state.setSocketStatus);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");
    const onConnectError = (error: Error) => {
      setSocketStatus("disconnected");
      toast.error(`Connection lost: ${error.message}`);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [setSocketStatus]);

  return null;
}
