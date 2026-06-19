import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";

const messageRateLimits = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL_MS = 60_000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of messageRateLimits.entries()) {
    if (value.resetAt <= now) {
      messageRateLimits.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export const socketRateLimiterMiddleware = (socket: Socket) => {
  return (packet: any[], next: (err?: any) => void) => {
    const eventName = packet[0];

    if (eventName === SOCKET_EVENTS.MESSAGE_SEND) {
      const userId = socket.data.user?.id;
      if (userId) {
        const now = Date.now();
        const current = messageRateLimits.get(userId);

        if (!current || current.resetAt <= now) {
          messageRateLimits.set(userId, { count: 1, resetAt: now + 10000 }); 
        } else {
          current.count += 1;
          if (current.count > 10) {
            const callback = typeof packet[packet.length - 1] === "function" 
              ? packet[packet.length - 1] 
              : undefined;

            if (callback) {
              callback({ error: "You are sending messages too quickly. Please slow down." });
            }
            
            return;
          }
        }
      }
    }

    next();
  };
};
