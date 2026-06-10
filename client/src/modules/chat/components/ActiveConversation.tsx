"use client";

import { useConversationDetailsQuery } from "../hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { PresenceIndicator } from "./PresenceIndicator";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { MessageListSkeleton } from "./MessageListSkeleton";

interface ActiveConversationProps {
  conversationId: string;
}

import { ThemeToggle } from "@/shared/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_ROUTES } from "@/shared/constants/app_routes";

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const user = useUser();
  const currentUserId = user?.id || null;

  const { data: conversation, isLoading } = useConversationDetailsQuery(conversationId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        {/* Skeleton Header */}
        <div className="h-14 border-b flex items-center px-4 shrink-0 bg-background shadow-sm">
          <div className="flex items-center gap-3 w-full">
            <div className="md:hidden w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <MessageListSkeleton />
        {/* Skeleton Composer */}
        <div className="px-[15px] md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-background shrink-0 w-full">
          <div className="w-full flex items-end gap-2 bg-background dark:bg-zinc-950 border rounded-xl px-3 py-2 shadow-sm opacity-50">
            <div className="flex-1 min-w-0 flex items-center">
              <div className="w-full bg-transparent border-0 p-2 text-base min-h-[44px]" />
            </div>
            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
              <div className="h-5 w-5 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
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
      <div className="h-14 border-b flex items-center justify-between px-[15px] md:px-4 shrink-0 bg-background shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
          <div className="relative">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={otherMember?.user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-medium pt-[1px]">{title?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            {otherMember?.userId && (
              <PresenceIndicator userId={otherMember.userId} className="-bottom-0.5 -right-0.5" />
            )}
          </div>
          <h2 className="text-base font-bold text-foreground pt-[1px] truncate">{title}</h2>
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
