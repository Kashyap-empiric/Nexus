import { io, Socket } from "socket.io-client";
import { supabase } from "@/shared/lib/supabase";
import { ENV } from "@/config/env";

const SOCKET_URL = ENV.API_URL.replace("/api", "");

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  timeout: 30_000,
  reconnectionDelay: 2000,
  reconnectionAttempts: 5,
  auth: async (cb) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      cb({ token: session?.access_token });
    } catch (err) {
      console.error("[Socket] Auth error:", err);
      cb({ token: null });
    }
  },
});
