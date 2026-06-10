"use client";

import { useConversationDetailsQuery } from "../hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { PresenceIndicator } from "./PresenceIndicator";
import { useUser } from "@/modules/auth/store/useAuthStore";

interface ActiveConversationProps {
  conversationId: string;
}

import { ThemeToggle } from "@/shared/components/theme-toggle";

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const user = useUser();
  const currentUserId = user?.id || null;

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
  const title = conversation.name || otherName || (isDM ? "Deleted user" : "Channel");

  const myProfile = conversation.members.find((m) => m.userId === currentUserId)?.user;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Top Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={otherMember?.user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-medium pt-[1px]">{title?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            {otherMember?.userId && (
              <PresenceIndicator userId={otherMember.userId} className="-bottom-0.5 -right-0.5" />
            )}
          </div>
          <h2 className="text-[15px] font-bold text-foreground pt-[1px]">{title}</h2>
        </div>
        <ThemeToggle />
      </div>

      {/* Messages */}
      <MessageList 
        conversationId={conversationId} 
        currentUserId={currentUserId}
        myLastReadMessageId={conversation.members.find(m => m.userId === currentUserId)?.lastReadMessageId}
        partnerLastReadMessageId={otherMember?.lastReadMessageId}
      />

      {/* Input */}
      <MessageInput conversationId={conversationId} currentUser={myProfile} />
    </div>
  );
}
