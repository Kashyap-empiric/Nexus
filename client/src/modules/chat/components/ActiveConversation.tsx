"use client";

import { useConversationsQuery, useConversationDetailsQuery } from "@/modules/conversations/hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "@/modules/messages/components/MessageList";
import { MessageInput } from "@/modules/messages/components/MessageInput";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { MessageListSkeleton } from "@/modules/messages/components/MessageListSkeleton";
import { useWorkspaceDetails } from "@/modules/workspaces/hooks/useWorkspaces";

interface ActiveConversationProps {
  conversationId: string;
}

import { ThemeToggle } from "@/shared/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { APP_ROUTES } from "@/shared/constants/app_routes";

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const user = useUser();
  const currentUserId = user?.id || null;

  const { data: conversation, isLoading } = useConversationDetailsQuery(conversationId);
  const { data: conversations } = useConversationsQuery();
  
  const isChannel = conversation?.type === "CHANNEL";
  const { data: workspaceDetails } = useWorkspaceDetails(isChannel ? conversation?.workspaceId || null : null);

  const totalUnreadCount = conversations?.reduce((acc, conv) => {
    if (conv.id !== conversationId) {
      return acc + (conv.unreadCount || 0);
    }
    return acc;
  }, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        {/* Skeleton Header */}
        <div className="h-14 border-b flex items-center px-4 shrink-0 bg-background shadow-sm">
          <div className="flex items-center gap-3 w-full">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
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

  // Find the other member to display their name if it's a DM
  const isDM = conversation.type === "DM";
  const otherMember = isDM ? conversation.members.find((m) => m.userId !== currentUserId) : undefined;
  const otherName = otherMember?.user?.username;
  const title = isChannel ? conversation.name : (otherName || "Deleted user");

  const myProfile = conversation.members.find((m) => m.userId === currentUserId)?.user;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Top Header */}
      <div className="h-14 border-b flex items-center justify-between px-[15px] md:px-4 shrink-0 bg-background shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="md:hidden relative p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            {totalUnreadCount > 0 && (
              <span className="
                absolute bottom-0 right-0
                flex h-[18px] min-w-[18px]
                items-center justify-center
                rounded-full bg-red-500
                px-1 text-[10px]
                leading-none
                font-bold text-white
                shadow-sm ring-2 ring-background
              ">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
            <span className="sr-only">Back</span>
          </Link>
          
          {isChannel ? (
            <div className="flex items-center gap-2">
              <Hash className="h-6 w-6 text-muted-foreground" />
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-foreground leading-none truncate">{title}</h2>
                {workspaceDetails?.workspace && (
                  <span className="text-[12px] text-muted-foreground leading-tight truncate">
                    {workspaceDetails.workspace.name}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <UserAvatar
                  name={title || ""}
                  src={otherMember?.user?.avatarUrl}
                  className="h-9 w-9 shrink-0"
                  fallbackClassName="bg-primary/20 text-primary font-medium"
                />
                {otherMember?.userId && (
                  <PresenceIndicator userId={otherMember.userId} className="-bottom-0.5 -right-0.5" />
                )}
              </div>
              <h2 className="text-base font-bold text-foreground leading-none truncate">{title}</h2>
            </>
          )}
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
