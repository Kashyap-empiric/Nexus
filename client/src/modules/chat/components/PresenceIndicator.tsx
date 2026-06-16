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

  // If they are invisible or offline, show gray.
  // Otherwise show status color or default green for AVAILABLE.
  const isActuallyOnline = isOnline && status !== "INVISIBLE";
  
  let colorClass = "bg-muted-foreground";
  if (isActuallyOnline) {
    if (status === "DND") colorClass = "bg-red-500";
    else if (status === "AWAY") colorClass = "bg-yellow-500";
    else colorClass = "bg-green-500";
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
