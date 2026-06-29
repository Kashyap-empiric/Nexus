"use client";

import { useEffect, useRef } from "react";
import { useMessagesInfiniteQuery } from "@/modules/messages/hooks/useMessages";
import { useMarkConversationReadMutation } from "@/modules/conversations/hooks/useConversations";
import { useMessageScroll } from "@/modules/chat/hooks/useMessageScroll";
import { MessageGroupItem } from "./MessageGroupItem";
import { groupMessages, type MessageGroup } from "@/modules/chat/utils/groupMessages";
import { MessageListSkeleton } from "./MessageListSkeleton";
import { TypingIndicator } from "./TypingIndicator";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import React from "react";
import type { ConversationMember, User } from "@/modules/conversations/types/conversation";
import { formatMessageDateSeparator } from "@/shared/lib/utils";

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

  const rawMessages = data?.pages.flatMap((page) => page?.data || []).reverse() || [];
  const oldestMessageId = rawMessages[0]?.id;

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
    oldestMessageId,
    isLatestMessageMine,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // Mark messages as read on conversation switch or unmount
  const conversationIdRef = useRef(conversationId);
  const latestMessageIdRef = useRef(latestMessageId);
  const myLastReadMessageRef = useRef(myLastReadMessageId);
  const markReadFnRef = useRef(markRead);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    latestMessageIdRef.current = latestMessageId;
    myLastReadMessageRef.current = myLastReadMessageId;
    markReadFnRef.current = markRead;
  });

  useEffect(() => {
    return () => {
      const msgId = latestMessageIdRef.current;
      const lastReadId = myLastReadMessageRef.current;
      if (msgId && msgId !== lastReadId) {
        markReadFnRef.current({ conversationId: conversationIdRef.current, messageId: msgId });
      }
    };
  }, [conversationId]);



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

  const messageGroups = groupMessages(rawMessages);
  const pinnedMessageIds = new Set(data?.pages.flatMap((page) => page?.pinnedMessageIds || []) || []);

  // Determine effective last read position
  const effectiveLastReadId =
    isLatestMessageMine && latestMessageId ? latestMessageId :
      myLastReadMessageId;

  // Insert unread divider into message groups
  const { displayGroups, dividerAfterGroup } = insertUnreadDivider(messageGroups, effectiveLastReadId);

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

  return (
    <div className="flex-1 relative min-h-0 flex flex-col bg-background overflow-x-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-4"
      >
        <div className="w-full">
          <div ref={observerTarget} className="h-10 mt-2 mb-2 w-full flex items-center justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/40 text-muted-foreground shadow-sm backdrop-blur-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">Loading older messages...</span>
              </div>
            )}
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

          {displayGroups.map((group, index) => {
            const currentGroupDate = formatMessageDateSeparator(group.createdAt);
            const prevGroupDate = index > 0 ? formatMessageDateSeparator(displayGroups[index - 1].createdAt) : null;
            const showDateSeparator = currentGroupDate !== prevGroupDate;

            return (
              <React.Fragment key={group.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-6">
                    <div className="h-px bg-border flex-1 mx-4" />
                    <span className="text-xs text-[#A0AAB2] font-medium shrink-0">
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
                {index === dividerAfterGroup && (
                  <UnreadDivider />
                )}
              </React.Fragment>
            );
          })}

          { }
          <TypingIndicator
            conversationId={conversationId}
            currentUserId={currentUserId}
          />

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      { }
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

/**
 * Inserts an unread divider into message groups based on the last-read message ID.
 * Splits any group that contains the last-read message in the middle.
 */
function insertUnreadDivider(
  groups: MessageGroup[],
  lastReadMessageId: string | null | undefined
): { displayGroups: MessageGroup[]; dividerAfterGroup: number | null } {
  if (!lastReadMessageId) {
    return { displayGroups: groups, dividerAfterGroup: null };
  }

  const result: MessageGroup[] = [];
  let dividerAfterGroup: number | null = null;

  for (const group of groups) {
    const msgIndex = group.messages.findIndex(m => m.id === lastReadMessageId);
    if (msgIndex === -1) {
      result.push(group);
      continue;
    }

    // Found the last read message in this group
    if (msgIndex === group.messages.length - 1) {
      // Last message in the group — divider goes after this group
      result.push(group);
      dividerAfterGroup = result.length - 1;
    } else {
      // Middle of the group — split into two groups with divider between
      // Part 1: messages up to and including the last read message
      result.push({
        ...group,
        id: group.id + "-read",
        messages: group.messages.slice(0, msgIndex + 1),
      });
      dividerAfterGroup = result.length - 1;
      // Part 2: messages after the last read message (unread)
      result.push({
        ...group,
        messages: group.messages.slice(msgIndex + 1),
      });
    }
  }

  // If the divider is after the last group, there are no unread messages — don't show it
  if (dividerAfterGroup !== null && dividerAfterGroup === result.length - 1) {
    dividerAfterGroup = null;
  }

  return { displayGroups: result, dividerAfterGroup };
}

function UnreadDivider() {
  return (
    <div className="flex items-center justify-center my-4 px-4 md:px-6">
      <div className="h-px bg-destructive/30 flex-1" />
      <span className="text-xs font-semibold text-destructive mx-3 shrink-0 uppercase tracking-wider select-none">
        New
      </span>
      <div className="h-px bg-destructive/30 flex-1" />
    </div>
  );
}
