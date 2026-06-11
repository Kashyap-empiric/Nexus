"use client";

import { useState, useRef, useEffect } from "react";
import { useSendMessageMutation } from "../hooks/useMessages";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { User } from "../types/conversation";

interface MessageInputProps {
  conversationId: string;
  currentUser?: User;
  disabled?: boolean;
}

export function MessageInput({ conversationId, currentUser, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { mutate: sendMessage } = useSendMessageMutation(conversationId, currentUser);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [content]);

  const submitMessage = () => {
    if (!content.trim()) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sendMessage({ conversationId, content, tempId });
    setContent("");
    
    // Reset height explicitly
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Determine if we are on a mobile device
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (e.key === 'Enter') {
      if (isMobile) {
        // On mobile, Enter just adds a new line (default behavior).
        // User must tap the send button.
        return;
      }

      // On desktop, Enter sends the message, Shift+Enter adds a new line
      if (!e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-[15px] md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-background shrink-0 w-full">
      <div className="w-full flex items-end gap-2 bg-background dark:bg-zinc-950 border rounded-xl px-3 py-2 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
        <div className="flex-1 min-w-0 flex items-center">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Message..."
            rows={1}
            className="w-full bg-transparent border-0 focus:ring-0 px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground resize-none block overflow-y-auto disabled:opacity-50"
            style={{ maxHeight: "140px", minHeight: "36px" }}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          disabled={!content.trim() || disabled}
          size="icon"
          variant="ghost"
          className={`shrink-0 h-9 w-9 rounded-md transition-all flex items-center justify-center hover:bg-muted ${content.trim() ? "text-primary" : "text-muted-foreground opacity-50"}`}
        >
          <SendHorizontal className="h-6 w-6" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
