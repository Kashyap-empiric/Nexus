import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/shared/components/ui/tooltip";

interface MessageStatusProps {
  isPending?: boolean;
  messageId: string;
  partnerLastReadMessageId?: string | null;
  readCount?: number;
  isChannel?: boolean;
  className?: string;
}

export const MessageStatus = ({
  isPending,
  messageId,
  partnerLastReadMessageId,
  readCount = 0,
  isChannel = false,
  className,
}: MessageStatusProps) => {
  if (isPending) {
    return <Clock className={cn("h-3 w-3 text-muted-foreground", className)} />;
  }

  // For DMs: check if the partner has read the message
  const isReadByPartner = partnerLastReadMessageId && messageId <= partnerLastReadMessageId;
  // For channels: check if any other member has read the message
  const isReadByOthers = isChannel ? readCount > 0 : isReadByPartner;

  const icon = isReadByOthers ? (
    <CheckCheck className={cn("h-4 w-4 text-blue-500", className)} />
  ) : (
    <Check className={cn("h-4 w-4 text-muted-foreground", className)} />
  );

  // For channels with readers, show a tooltip with the read count
  if (isChannel && readCount > 0) {
    const tooltipText = readCount === 1 ? "Read by 1" : `Read by ${readCount}`;
    return (
      <TooltipProvider>
        <TooltipTrigger className="flex items-center cursor-default">
          {icon}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {tooltipText}
        </TooltipContent>
      </TooltipProvider>
    );
  }

  return icon;
};
