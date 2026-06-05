"use client";

import { useConversationDetailsQuery } from "@/hooks/useConversations";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ActiveConversationProps {
  conversationId: string;
}

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
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
  const otherMember = conversation.members.find((m: any) => m.userId !== currentUserId);
  const otherName = otherMember?.user?.username;
  const title = conversation.name || otherName || (isDM ? "Direct Message" : "Channel");

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Top Header */}
      <div className="h-16 border-b flex items-center px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={otherMember?.user?.avatarUrl || undefined} />
            <AvatarFallback className="leading-none">{title?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold leading-none">{title}</h2>
        </div>
      </div>

      {/* Messages */}
      <MessageList conversationId={conversationId} currentUserId={currentUserId} />

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
