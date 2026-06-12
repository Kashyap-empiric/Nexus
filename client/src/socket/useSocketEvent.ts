import { useEffect } from "react";
import { socket } from "./socketClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSocketEvent(event: string, handler: (...args: any[]) => void) {
  useEffect(() => {
    if (!socket) return;
    
    socket.on(event, handler);
    
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SocketHandlerMap = Record<string, (...args: any[]) => void>;

export function useSocketEvents(handlers: SocketHandlerMap) {
  useEffect(() => {
    if (!socket) return;

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [handlers]);
}
