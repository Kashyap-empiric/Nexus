"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { InviteType } from "../types/invites";

interface InviteModalState {
  isOpen: boolean;
  type: InviteType | undefined;
  entityId: string | undefined;
  open: (type: InviteType, entityId?: string) => void;
  close: () => void;
}

const InviteModalContext = createContext<InviteModalState | null>(null);

export function InviteModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<InviteType | undefined>();
  const [entityId, setEntityId] = useState<string | undefined>();

  const open = useCallback((t: InviteType, id?: string) => {
    setType(t);
    setEntityId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setType(undefined);
      setEntityId(undefined);
    }, 300);
  }, []);

  return (
    <InviteModalContext.Provider value={{ isOpen, type, entityId, open, close }}>
      {children}
    </InviteModalContext.Provider>
  );
}

export function useInviteModalContext(): InviteModalState {
  const context = useContext(InviteModalContext);
  if (!context) {
    throw new Error("useInviteModalContext must be used within an InviteModalProvider");
  }
  return context;
}
