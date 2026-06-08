import { useEffect } from "react";
import { socket } from "@/shared/lib/socket";
import { useChatStore } from "@/modules/chat";

export const useSocket = () => {
  const setSocketStatus = useChatStore((state) => state.setSocketStatus);

  useEffect(() => {
    socket.connect();

    const onConnect = () => setSocketStatus("connected");
    const onDisconnect = () => setSocketStatus("disconnected");
    const onConnectError = () => setSocketStatus("disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [setSocketStatus]);
};
