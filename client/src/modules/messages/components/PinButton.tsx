import { usePinMessage, useUnpinMessage } from "@/modules/messages/hooks/usePinnedMessages";
import { Button } from "@/shared/components/ui/button";
import { Pin } from "lucide-react";

interface PinButtonProps {
  conversationId: string;
  messageId: string;
  isPinned: boolean | undefined;
}

export function PinButton({ conversationId, messageId, isPinned }: PinButtonProps) {
  const pinMutation = usePinMessage(conversationId);
  const unpinMutation = useUnpinMessage(conversationId);

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
      className={`h-7 w-7 text-muted-foreground hover:text-foreground ${isPinned ? "text-amber-500 hover:text-amber-600" : ""}`}
      onClick={handleClick}
      title={isPinned ? "Unpin message" : "Pin message"}
      disabled={pinMutation.isPending || unpinMutation.isPending}
    >
      <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
    </Button>
  );
}
