"use client";

import { useState } from "react";
import { useSendMessageMutation } from "../hooks/useMessages";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "../hooks/useConversations";

interface MessageInputProps {
  conversationId: string;
  currentUser?: User;
}

export function MessageInput({ conversationId, currentUser }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { mutate: sendMessage, isPending } = useSendMessageMutation(conversationId, currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-6 pb-4 pt-2 bg-background shrink-0">
      <div className="w-full flex items-end gap-2 bg-background dark:bg-zinc-950 border rounded-xl px-3 py-2 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
        <div className="flex-1 min-w-0">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message..."
            className="w-full bg-transparent border-0 focus:ring-0 px-2 py-1.5 text-[15px] outline-none placeholder:text-muted-foreground"
            autoFocus
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={!content.trim() || isPending}
          size="icon"
          variant="ghost"
          className={`shrink-0 h-8 w-8 rounded-md transition-all flex items-center justify-center hover:bg-muted ${content.trim() ? "text-primary" : "text-muted-foreground opacity-50"}`}
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
