"use client";

import { useState, useCallback } from "react";
import { useSendMessageMutation } from "@/modules/messages/hooks/useMessages";
import { MessageInput } from "@/modules/messages/components/MessageInput";
import type { User } from "@/modules/conversations/types/conversation";

interface ThreadInputProps {
  conversationId: string;
  threadRootId: string;
  currentUser?: User;
}

export function ThreadInput({ conversationId, threadRootId, currentUser }: ThreadInputProps) {
  const [isBroadcast, setIsBroadcast] = useState(false);
  const { mutate: sendMessage } = useSendMessageMutation(conversationId, currentUser);

  const handleSubmit = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      const tempId = `temp-${crypto.randomUUID()}`;
      sendMessage({
        conversationId,
        content,
        tempId,
        replyToId: null,
        threadRootId,
        isThreadBroadcast: isBroadcast,
      });
      setIsBroadcast(false);
    },
    [conversationId, threadRootId, isBroadcast, sendMessage],
  );

  return (
    <MessageInput
      conversationId={conversationId}
      currentUser={currentUser}
      placeholder="Reply in thread..."
      onSubmit={handleSubmit}
      threadRootId={threadRootId}
    >
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group">
        <input
          type="checkbox"
          checked={isBroadcast}
          onChange={(e) => setIsBroadcast(e.target.checked)}
          className="rounded border-muted-foreground/30 text-brand focus:ring-brand/30 h-3.5 w-3.5 cursor-pointer"
        />
        <span className="group-hover:text-foreground transition-colors">Also send to channel</span>
      </label>
    </MessageInput>
  );
}
