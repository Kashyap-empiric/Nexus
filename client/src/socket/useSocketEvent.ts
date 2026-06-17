import { useEffect } from "react";
import { socket } from "./socketClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic constraint for backward compatibility; tightened in Phase 2
export type SocketHandlerMap<E extends Record<string, any> = Record<string, any>> = {
  [K in keyof E]?: (payload: E[K]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same reason
export function useSocketEvent<E extends Record<string, any>>(
  event: keyof E,
  handler: (payload: E[keyof E]) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event as string, handler as (...args: unknown[]) => void);

    return () => {
      socket.off(event as string, handler as (...args: unknown[]) => void);
    };
  }, [event, handler]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same reason
export function useSocketEvents<E extends Record<string, any>>(handlers: SocketHandlerMap<E>) {
  useEffect(() => {
    if (!socket) return;

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler as (...args: unknown[]) => void);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler as (...args: unknown[]) => void);
      });
    };
  }, [handlers]);
}
