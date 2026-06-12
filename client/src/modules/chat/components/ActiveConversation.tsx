"use client";

import { useEffect } from "react";
import { useConversationsQuery, useConversationDetailsQuery } from "@/modules/conversations/hooks/useConversations";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { MessageList } from "@/modules/messages/components/MessageList";
import { MessageInput } from "@/modules/messages/components/MessageInput";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useChatStore } from "../store/chatStore";
import { MessageListSkeleton } from "@/modules/messages/components/MessageListSkeleton";
import { useWorkspaceDetails } from "@/modules/workspaces/hooks/useWorkspaces";
import { MemberListPanel } from "@/modules/workspaces/components/MemberListPanel";
import { X } from "lucide-react";

interface ActiveConversationProps {
  conversationId: string;
}

export function ActiveConversation({ conversationId }: ActiveConversationProps) {
  useConversationSocket(conversationId);
  const user = useUser();
  const currentUserId = user?.id || null;
  const setHeaderInfo = useChatStore((state) => state.setHeaderInfo);
  const memberPanelOpen = useChatStore((state) => state.headerInfo?.memberPanelOpen ?? false);
  const isChannelFromStore = useChatStore((state) => state.headerInfo?.isChannel ?? false);

  const { data: conversation, isLoading } = useConversationDetailsQuery(conversationId);
  const { data: conversations } = useConversationsQuery();
  
  const isChannel = conversation?.type === "CHANNEL";
  const { data: workspaceDetails } = useWorkspaceDetails(isChannel ? conversation?.workspaceId || null : null);

  // Set header info when conversation data loads
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

  const isDM = conversation.type === "DM";
  const otherMember = isDM ? conversation.members.find((m) => m.userId !== currentUserId) : undefined;
  const myProfile = conversation.members.find((m) => m.userId === currentUserId)?.user;

  return (
    <div className="flex-1 flex h-full min-w-0">
      <div className="flex-1 flex flex-col h-full bg-background min-w-0">
        <MessageList
          conversationId={conversationId}
          currentUserId={currentUserId}
          myLastReadMessageId={conversation.members.find(m => m.userId === currentUserId)?.lastReadMessageId}
          partnerLastReadMessageId={otherMember?.lastReadMessageId}
        />

        <MessageInput conversationId={conversationId} currentUser={myProfile} />
      </div>

      {/* Member List Sidebar for Workspaces */}
      {isChannel && conversation.workspaceId && (
        <>
          {/* Desktop version */}
          <div className="hidden md:block">
            {memberPanelOpen && (
              <MemberListPanel workspaceId={conversation.workspaceId} />
            )}
          </div>
          
          {/* Mobile version */}
          <div className={`md:hidden flex flex-col fixed inset-y-0 right-0 z-50 w-[85vw] bg-background shadow-xl border-l transform transition-transform duration-300 ease-in-out ${memberPanelOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="font-semibold text-lg text-foreground">Members</h2>
              <button 
                onClick={() => useChatStore.getState().setMemberPanelOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MemberListPanel workspaceId={conversation.workspaceId} />
            </div>
          </div>
          {/* Mobile overlay */}
          {memberPanelOpen && (
            <div 
              className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
              onClick={() => useChatStore.getState().setMemberPanelOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
