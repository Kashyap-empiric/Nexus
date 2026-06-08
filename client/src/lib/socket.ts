import { io, Socket } from "socket.io-client";
import { supabase } from "./supabase";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL 
  ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "") 
  : "http://localhost:3001";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // We'll manually connect in useSocket.ts
  auth: async (cb) => {
    const { data: { session } } = await supabase.auth.getSession();
    cb({ token: session?.access_token });
  },
});
