import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface MessageStatusProps {
  isPending?: boolean;
  messageId: string;
  partnerLastReadMessageId?: string | null;
  className?: string;
}

export const MessageStatus = ({
  isPending,
  messageId,
  partnerLastReadMessageId,
  className,
}: MessageStatusProps) => {
  if (isPending) {
    return <Clock className={cn("h-3 w-3 text-muted-foreground", className)} />;
  }

  const isRead = partnerLastReadMessageId && messageId <= partnerLastReadMessageId;

  if (isRead) {
    return <CheckCheck className={cn("h-4 w-4 text-blue-500", className)} />;
  }

  return <Check className={cn("h-4 w-4 text-muted-foreground", className)} />;
};
