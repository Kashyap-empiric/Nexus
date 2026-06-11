import { useState } from "react";

export type InviteType = "USER" | "CONVERSATION" | "WORKSPACE" | "CHANNEL";

export const useInviteModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<InviteType | undefined>();
  const [entityId, setEntityId] = useState<string | undefined>();

  const open = (t: InviteType, id?: string) => {
    setType(t);
    setEntityId(id);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setType(undefined);
    setEntityId(undefined);
  };

  return { isOpen, type, entityId, open, close };
};
