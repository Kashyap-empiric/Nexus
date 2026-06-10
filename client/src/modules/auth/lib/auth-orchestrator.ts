import { socket } from "@/shared/lib/socket";
import { resetAllStores } from "@/shared/lib/store-reset";
import { QueryClient } from "@tanstack/react-query";

export const handleSignIn = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const handleSignOut = (queryClient: QueryClient) => {
  if (socket.connected) {
    socket.disconnect();
  }
  resetAllStores();
  queryClient.clear();
};
