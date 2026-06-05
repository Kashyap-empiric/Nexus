import { useState } from "react";
import { useSendMessageMutation } from "@/hooks/useMessages";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { mutate: sendMessage, isPending } = useSendMessageMutation(conversationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-background border-t">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          autoFocus
          autoComplete="off"
        />
        <Button 
          type="submit" 
          disabled={!content.trim() || isPending}
          size="icon"
          className="shrink-0"
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
