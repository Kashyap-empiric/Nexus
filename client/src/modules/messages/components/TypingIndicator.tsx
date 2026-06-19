"use client";

import { useSocketStore } from "@/socket/socketStore";
import { cn } from "@/shared/lib/utils";

const TYPING_EXPIRY_MS = 4000;

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId?: string | null;
  className?: string;
}

export function TypingIndicator({ conversationId, currentUserId, className }: TypingIndicatorProps) {
  const conversationTyping = useSocketStore(
    (state) => state.typingUsers.get(conversationId)
  );

  if (!conversationTyping || conversationTyping.size === 0) return null;

  const now = Date.now();
  const activeTypers = Array.from(conversationTyping.values()).filter(
    (u) => u.userId !== currentUserId && now - u.timestamp < TYPING_EXPIRY_MS
  );

  if (activeTypers.length === 0) return null;

  const names = activeTypers.map((u) => u.username);

  let typingText: string;
  if (names.length === 1) {
    typingText = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    typingText = `${names[0]} and ${names[1]} are typing...`;
  } else {
    typingText = `${names[0]} and ${names.length - 1} others are typing...`;
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-[15px] md:px-6 py-1 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </span>
      <span className="ml-1 italic">{typingText}</span>
    </div>
  );
}
