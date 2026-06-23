import { usePinMessage, useUnpinMessage } from "@/modules/messages/hooks/usePinnedMessages";
import { Button } from "@/shared/components/ui/button";
import { Pin } from "lucide-react";

interface PinButtonProps {
  conversationId: string;
  messageId: string;
  isPinned: boolean | undefined;
  canPin?: boolean;
}

export function PinButton({ conversationId, messageId, isPinned, canPin = true }: PinButtonProps) {
  const pinMutation = usePinMessage(conversationId);
  const unpinMutation = useUnpinMessage(conversationId);

  if (!canPin) return null;

  const handleClick = () => {
    if (isPinned) {
      unpinMutation.mutate(messageId);
    } else {
      pinMutation.mutate(messageId);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 rounded-none text-muted-foreground hover:bg-accent/60 hover:text-foreground ${isPinned ? "text-message-pinned" : ""}`}
      onClick={handleClick}
      title={isPinned ? "Unpin message" : "Pin message"}
      disabled={pinMutation.isPending || unpinMutation.isPending}
    >
      <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-message-pinned" : ""}`} />
    </Button>
  );
}
