"use client";

import { useState, useCallback } from "react";
import { useSendMessageMutation } from "@/modules/messages/hooks/useMessages";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { User } from "@/modules/conversations/types/conversation";

interface ThreadInputProps {
  conversationId: string;
  threadRootId: string;
  currentUser?: User;
}

export function ThreadInput({ conversationId, threadRootId, currentUser }: ThreadInputProps) {
  const [content, setContent] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const { mutate: sendMessage } = useSendMessageMutation(conversationId, currentUser);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;

      const tempId = `temp-${crypto.randomUUID()}`;
      sendMessage({
        conversationId,
        content: content.trim(),
        tempId,
        replyToId: null,
        threadRootId,
        isThreadBroadcast: isBroadcast,
      });
      setContent("");
      setIsBroadcast(false);
    },
    [content, conversationId, threadRootId, isBroadcast, sendMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) form.requestSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply in thread..."
          rows={1}
          className="flex-1 min-w-0 bg-muted/50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none max-h-32"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim()}
          className="shrink-0 h-9 w-9"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 px-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={isBroadcast}
            onChange={(e) => setIsBroadcast(e.target.checked)}
            className="rounded border-muted-foreground/30 text-brand focus:ring-brand/30 h-3.5 w-3.5 cursor-pointer"
          />
          Also send to channel
        </label>
      </div>
    </form>
  );
}
