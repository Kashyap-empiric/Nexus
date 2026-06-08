import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";

const messageRateLimits = new Map<string, { count: number; resetAt: number }>();

export const socketRateLimiterMiddleware = (socket: Socket) => {
  return (packet: any[], next: (err?: any) => void) => {
    const eventName = packet[0];

    // We only apply this specific rate limit to message sending
    if (eventName === SOCKET_EVENTS.MESSAGE_SEND) {
      const userId = socket.data.user?.id;
      if (userId) {
        const now = Date.now();
        const current = messageRateLimits.get(userId);

        if (!current || current.resetAt <= now) {
          messageRateLimits.set(userId, { count: 1, resetAt: now + 10000 }); // 10 seconds window
        } else {
          current.count += 1;
          if (current.count > 10) {
            // Find the callback function (usually the last argument in the packet array)
            const callback = typeof packet[packet.length - 1] === "function" 
              ? packet[packet.length - 1] 
              : undefined;

            if (callback) {
              callback({ error: "You are sending messages too quickly. Please slow down." });
            }
            
            // Drop the packet entirely by not calling next()
            return;
          }
        }
      }
    }

    // Process all other packets normally
    next();
  };
};
