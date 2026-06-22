"use client";

import { useEffect, useState, useCallback } from "react";
import { useConversationsQuery, useConversationDetailsQuery } from "@/modules/conversations/hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "@/modules/messages/components/MessageList";
import { MessageInput } from "@/modules/messages/components/MessageInput";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useChatStore } from "../store/chatStore";
import { MessageListSkeleton } from "@/modules/messages/components/MessageListSkeleton";
import { useWorkspaceDetails } from "@/modules/workspaces/hooks/useWorkspaces";
import { useLayoutUI } from "@/shared/components/layout/AppLayoutShell";
import { InfoPanel } from "./InfoPanel";

interface ActiveConversationProps {
  conversationId: string;
  highlightMessageId?: string;
}

export function ActiveConversation({ conversationId, highlightMessageId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const user = useUser();
  const currentUserId = user?.id || null;
  const setHeaderInfo = useChatStore((state) => state.setHeaderInfo);

  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const handleReply = useCallback((messageId: string, username: string, content: string) => {
    setReplyingTo({ id: messageId, username, content });
  }, []);
  const handleClearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);
  const { infoPanelOpen, infoPanelView, setInfoPanelView, closeInfoPanel } = useLayoutUI();

  const { data: conversation, isLoading } = useConversationDetailsQuery(conversationId);
  const { data: conversations } = useConversationsQuery();
  
  const isChannel = conversation?.type === "CHANNEL";
  const { data: workspaceDetails } = useWorkspaceDetails(isChannel ? conversation?.workspaceId || null : null);

  const canPin = !isChannel
    ? true
    : workspaceDetails?.workspace.members?.some(
        (m: { userId: string; role: string }) => m.userId === currentUserId && (m.role === "OWNER" || m.role === "ADMIN")
      ) ?? false;

  useEffect(() => {
    if (!conversation) return;

    const isDM = conversation.type === "DM";
    const otherMember = isDM ? conversation.members.find((m) => m.userId !== currentUserId) : undefined;
    const otherName = otherMember?.user?.username;
    const title = isChannel ? conversation.name : (otherName || "Deleted user");

    const totalUnreadCount = conversations?.reduce((acc, conv) => {
      if (conv.id !== conversationId) {
        return acc + (conv.unreadCount || 0);
      }
      return acc;
    }, 0) || 0;

    setHeaderInfo({
      title: title || "",
      subtitle: isChannel ? workspaceDetails?.workspace?.name : undefined,
      isChannel,
      workspaceId: isChannel ? conversation.workspaceId : null,
      otherMember: otherMember ? {
        userId: otherMember.userId,
        username: otherMember.user.username,
        avatarUrl: otherMember.user.avatarUrl,
      } : null,
      totalUnreadCount,
      memberPanelOpen: false,
    });

    return () => {
      setHeaderInfo(null);
    };
  }, [conversation, currentUserId, conversations, conversationId, isChannel, workspaceDetails, setHeaderInfo]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <MessageListSkeleton />
        <div className="px-4 md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-background shrink-0 w-full">
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

  const isDM = conversation.type === "DM";
  const otherMember = isDM ? conversation.members.find((m) => m.userId !== currentUserId) : undefined;
  const myProfile = conversation.members.find((m) => m.userId === currentUserId)?.user;

  return (
    <div className="flex-1 flex h-full min-w-0 max-w-full">
      <div className="flex-1 flex flex-col h-full bg-background min-w-0 w-full">
        <MessageList
          conversationId={conversationId}
          currentUserId={currentUserId}
          myLastReadMessageId={conversation.members.find(m => m.userId === currentUserId)?.lastReadMessageId}
          partnerLastReadMessageId={otherMember?.lastReadMessageId}
          members={isChannel ? conversation.members : undefined}
          otherMember={!isChannel && otherMember ? otherMember.user : undefined}
          isChannel={isChannel || undefined}
          onReply={handleReply}
          highlightMessageId={highlightMessageId}
          canPin={canPin}
        />

        <MessageInput
          conversationId={conversationId}
          currentUser={myProfile}
          replyingTo={replyingTo}
          onClearReply={handleClearReply}
        />
      </div>

      {}
      {infoPanelOpen && (
        <>
          {}
          <div className="hidden md:block h-full border-l">
            <InfoPanel 
              conversationId={conversationId}
              workspaceId={isChannel ? conversation.workspaceId || undefined : undefined}
              channelId={isChannel ? conversationId : undefined}
              userId={isDM ? otherMember?.userId : undefined}
              channelName={isChannel ? conversation.name : undefined}
              description={isChannel ? conversation.description : undefined}
              visibility={isChannel ? conversation.visibility ?? null : undefined}
              createdAt={isChannel ? conversation.createdAt : undefined}
              view={infoPanelView}
              setInfoPanelView={setInfoPanelView}
              onClose={closeInfoPanel}
            />
          </div>
          
          {}
          <div className="md:hidden flex flex-col fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
            <InfoPanel 
              conversationId={conversationId}
              workspaceId={isChannel ? conversation.workspaceId || undefined : undefined}
              channelId={isChannel ? conversationId : undefined}
              userId={isDM ? otherMember?.userId : undefined}
              channelName={isChannel ? conversation.name : undefined}
              description={isChannel ? conversation.description : undefined}
              visibility={isChannel ? conversation.visibility ?? null : undefined}
              createdAt={isChannel ? conversation.createdAt : undefined}
              view={infoPanelView}
              setInfoPanelView={setInfoPanelView}
              onClose={closeInfoPanel}
            />
          </div>
          {}
          <div 
            className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={closeInfoPanel}
          />
        </>
      )}
    </div>
  );
}
