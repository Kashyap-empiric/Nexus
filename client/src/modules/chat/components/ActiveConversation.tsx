"use client";

import { useConversationDetailsQuery } from "../hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";

interface ActiveConversationProps {
  conversationId: string;
}

import { ThemeToggle } from "@/shared/components/theme-toggle";

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const { data: conversation, isLoading } = useConversationDetailsQuery(conversationId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background animate-pulse">
        <div className="h-14 border-b bg-muted/20" />
        <div className="flex-1" />
        <div className="h-16 border-t bg-muted/20" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Conversation not found.
      </div>
    );
  }

  // Find the other member to display their name
  const isDM = conversation.type === "DM";
  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const otherName = otherMember?.user?.username;
  const title = conversation.name || otherName || (isDM ? "Direct Message" : "Channel");

  const myProfile = conversation.members.find((m) => m.userId === currentUserId)?.user;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Top Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7 shrink-0 rounded-md">
            <AvatarImage src={otherMember?.user?.avatarUrl || undefined} className="rounded-md" />
            <AvatarFallback className="leading-none rounded-md bg-primary/20 text-primary font-medium">{title?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <h2 className="text-[15px] font-bold leading-none text-foreground">{title}</h2>
        </div>
        <ThemeToggle />
      </div>

      {/* Messages */}
      <MessageList conversationId={conversationId} />

      {/* Input */}
      <MessageInput conversationId={conversationId} currentUser={myProfile} />
    </div>
  );
}
