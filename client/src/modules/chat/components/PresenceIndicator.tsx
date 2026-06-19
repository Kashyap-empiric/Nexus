import { useSocketStore } from "@/socket/socketStore";
import { cn } from "@/shared/lib/utils";

interface PresenceIndicatorProps {
  userId: string;
  className?: string;
  status?: string;
}

export const PresenceIndicator = ({ userId, className, status }: PresenceIndicatorProps) => {
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const isOnline = onlineUsers.has(userId);

  const isActuallyOnline = isOnline && status !== "INVISIBLE";
  
  let colorClass = "bg-status-offline";
  if (isActuallyOnline) {
    if (status === "DND") colorClass = "bg-status-dnd";
    else if (status === "AWAY") colorClass = "bg-status-away";
    else colorClass = "bg-status-online";
  }

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
        colorClass,
        className
      )}
    />
  );
};
