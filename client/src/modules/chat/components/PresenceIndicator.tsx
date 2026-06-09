import { useChatStore } from "../store/chatStore";
import { cn } from "@/shared/lib/utils";

interface PresenceIndicatorProps {
  userId: string;
  className?: string;
}

export const PresenceIndicator = ({ userId, className }: PresenceIndicatorProps) => {
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const isOnline = onlineUsers.has(userId);

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
        isOnline ? "bg-green-500" : "bg-muted-foreground",
        className
      )}
    />
  );
};
