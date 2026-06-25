"use client";

import { useEffect, useRef } from "react";
import { useMessagesInfiniteQuery } from "@/modules/messages/hooks/useMessages";
import { useMarkConversationReadMutation } from "@/modules/conversations/hooks/useConversations";
import { useMessageScroll } from "@/modules/chat/hooks/useMessageScroll";
import { MessageGroupItem } from "./MessageGroupItem";
import { groupMessages } from "@/modules/chat/utils/groupMessages";
import { MessageListSkeleton } from "./MessageListSkeleton";
import { TypingIndicator } from "./TypingIndicator";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import React from "react";
import type { ConversationMember, User } from "@/modules/conversations/types/conversation";

interface MessageListProps {
  conversationId: string;
  currentUserId?: string | null;
  myLastReadMessageId?: string | null;
  partnerLastReadMessageId?: string | null;
  members?: ConversationMember[];
  isChannel?: boolean;
  otherMember?: User;
  onReply?: (messageId: string, username: string, content: string) => void;
  onOpenThread?: (messageId: string) => void;
  highlightMessageId?: string;
  canPin?: boolean;
}

export function MessageList({ conversationId, currentUserId, myLastReadMessageId, partnerLastReadMessageId, members, isChannel, otherMember, onReply, onOpenThread, highlightMessageId, canPin = true }: MessageListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useMessagesInfiniteQuery(conversationId);
  const { mutate: markRead } = useMarkConversationReadMutation();

  const latestMessage = data?.pages?.[0]?.data?.[0];
  const latestMessageId = latestMessage?.id;
  const isLatestMessageMine = latestMessage?.userId === currentUserId;

  const {
    scrollContainerRef,
    bottomRef,
    observerTarget,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  } = useMessageScroll({
    conversationId,
    latestMessageId,
    isLatestMessageMine,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  useEffect(() => {
    if (!latestMessageId) return;
    if (latestMessage?.pending) return;
    if (myLastReadMessageId && latestMessageId <= myLastReadMessageId) return;
    if (isLatestMessageMine) return; 

    markRead({
      conversationId,
      messageId: latestMessageId,
    });
  }, [conversationId, latestMessageId, markRead, myLastReadMessageId, isLatestMessageMine, latestMessage?.pending]);



  const highlightHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightMessageId || isFetchingNextPage || isLoading) return;

    if (highlightHandledRef.current === highlightMessageId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${highlightMessageId}`);
      if (!el) {
        if (hasNextPage) {
          fetchNextPage();
        }
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      document.querySelectorAll(".highlight-message").forEach((e) => e.classList.remove("highlight-message"));

      el.classList.add("highlight-message");

      highlightHandledRef.current = highlightMessageId;

      const url = new URL(window.location.href);
      if (url.searchParams.has("highlight")) {
        url.searchParams.delete("highlight");
        window.history.replaceState({}, "", url.toString());
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [highlightMessageId, data, isFetchingNextPage, isLoading, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive p-4">
        <p className="text-sm text-center">Failed to load messages. Check your connection and try again.</p>
      </div>
    );
  }

  const rawMessages = data?.pages.flatMap((page) => page?.data || []).reverse() || [];
  const messageGroups = groupMessages(rawMessages);
  const pinnedMessageIds = new Set(data?.pages.flatMap((page) => page?.pinnedMessageIds || []) || []);

  return (
    <div className="flex-1 relative min-h-0 flex flex-col bg-background overflow-x-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-4"
      >
        <div className="w-full mx-auto max-w-[var(--chat-max-width)]">
          <div ref={observerTarget} className="h-1 mt-1 w-full flex justify-center">
            {isFetchingNextPage && <span className="text-xs text-muted-foreground">Loading older messages...</span>}
          </div>

          {!hasNextPage && (
            <>
              {isChannel && messageGroups.length === 0 && (
                <div className="text-center text-muted-foreground pt-10 text-sm mt-auto">
                  <p>No messages yet. Send a message to start the conversation!</p>
                </div>
              )}
              {!isChannel && otherMember && (
                <div className="flex flex-col items-start px-4 md:px-6 xl:px-8 py-8 md:py-12 mt-auto">
                  <UserAvatar name={otherMember.username} src={otherMember.avatarUrl} className="h-20 w-20 md:h-24 md:w-24 mb-4 text-3xl" />
                  <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-1">{otherMember.username}</h1>
                  {otherMember.fullName && (
                    <p className="text-lg text-muted-foreground mb-4">{otherMember.fullName}</p>
                  )}
                  <p className="text-muted-foreground text-base">
                    This is the beginning of your direct message history with <span className="font-semibold text-foreground">@{otherMember.username}</span>.
                  </p>
                </div>
              )}
            </>
          )}

          {messageGroups.map((group, index) => {
            const currentGroupDate = new Date(group.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            const prevGroupDate = index > 0 ? new Date(messageGroups[index - 1].createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
            const showDateSeparator = currentGroupDate !== prevGroupDate;

            return (
              <React.Fragment key={group.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="h-px bg-border flex-1 mx-4" />
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {currentGroupDate}
                    </span>
                    <div className="h-px bg-border flex-1 mx-4" />
                  </div>
                )}
                <MessageGroupItem
                  group={group}
                  currentUserId={currentUserId}
                  partnerLastReadMessageId={partnerLastReadMessageId}
                  members={members}
                  isChannel={isChannel}
                  onReply={onReply}
                  onOpenThread={onOpenThread}
                  pinnedMessageIds={pinnedMessageIds}
                  canPin={canPin}
                />
              </React.Fragment>
            );
          })}

          {}
          <TypingIndicator
            conversationId={conversationId}
            currentUserId={currentUserId}
          />

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {}
      {!isAtBottom && (
        <div className="absolute bottom-2 right-4 md:right-8 z-10 animate-in fade-in zoom-in-95 duration-200">
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-card border border-border text-foreground hover:bg-muted relative"
            onClick={() => scrollToBottom("smooth")}
          >
            <ChevronDown className="h-5 w-5" />
            {hasNewMessages && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            )}
            <span className="sr-only">Jump to bottom</span>
          </Button>
        </div>
      )}
    </div>
  );
}
