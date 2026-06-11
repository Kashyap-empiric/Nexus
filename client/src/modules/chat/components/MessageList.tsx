"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMessagesInfiniteQuery } from "../hooks/useMessages";
import { useMarkConversationReadMutation } from "../hooks/useConversations";
import { MessageGroupItem } from "./MessageGroupItem";
import { groupMessages } from "../utils/groupMessages";
import { MessageListSkeleton } from "./MessageListSkeleton";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface MessageListProps {
  conversationId: string;
  currentUserId?: string | null;
  myLastReadMessageId?: string | null;
  partnerLastReadMessageId?: string | null;
}

export function MessageList({ conversationId, currentUserId, myLastReadMessageId, partnerLastReadMessageId }: MessageListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useMessagesInfiniteQuery(conversationId);
  const { mutate: markRead } = useMarkConversationReadMutation();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const prevConversationId = useRef(conversationId);
  const isAtBottomRef = useRef(true);
  const hasInitialScrolled = useRef(false);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const latestMessage = data?.pages?.[0]?.data?.[0];
  const latestMessageId = latestMessage?.id;
  const isLatestMessageMine = latestMessage?.userId === currentUserId;

  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    isProgrammaticScroll.current = true;
    bottomRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    setHasNewMessages(false);

    // Reset programmatic scroll flag after a frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 100);
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // 100px tolerance
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;

    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, []);

  // Auto-scroll logic based on rules
  useEffect(() => {
    // Rule 1: Conversation switch -> Reset initial load flag
    if (prevConversationId.current !== conversationId) {
      prevConversationId.current = conversationId;
      hasInitialScrolled.current = false;
    }

    if (!latestMessageId) return;

    // Rule 2: Initial load -> Jump instantly to bottom
    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      scrollToBottom("auto");
      return;
    }

    // Rule 3: Outgoing message (current user sent it) -> ALWAYS scroll to bottom
    if (isLatestMessageMine) {
      scrollToBottom("smooth");
      return;
    }

    // Rule 4: Incoming message
    if (isAtBottomRef.current) {
      // If already at bottom, stay at bottom
      scrollToBottom("smooth");
    } else {
      // If scrolled up, DO NOT scroll, but show indicator
      setHasNewMessages(true);
    }
  }, [latestMessageId, conversationId, isLatestMessageMine, scrollToBottom]);

  // Mark conversation as read when entering or when new messages arrive
  useEffect(() => {
    if (!latestMessageId) return;
    if (latestMessage?.pending) return;
    if (myLastReadMessageId && latestMessageId <= myLastReadMessageId) return;
    if (isLatestMessageMine) return; // Prevent redundant API call if we sent the message

    markRead({
      conversationId,
      messageId: latestMessageId,
    });
  }, [conversationId, latestMessageId, markRead, myLastReadMessageId]);

  // Intersection observer for infinite scroll up
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-4">
        <p className="font-bold">Error fetching messages:</p>
        <pre className="text-sm bg-red-50/10 p-2 mt-2 rounded">{(error as Error)?.message || "Unknown error"}</pre>
      </div>
    );
  }

  const rawMessages = data?.pages.flatMap((page) => page?.data || []).reverse() || [];
  const messageGroups = groupMessages(rawMessages);

  return (
    <div className="flex-1 relative min-h-0 flex flex-col bg-background">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-4 pt-2"
      >
        <div className="w-full md:px-6">
          <div ref={observerTarget} className="h-4 w-full flex justify-center">
            {isFetchingNextPage && <span className="text-xs text-muted-foreground">Loading older messages...</span>}
          </div>

          {messageGroups.length === 0 ? (
            <div className="text-center text-muted-foreground pt-10 text-sm">
              <p>No messages yet. Send a message to start the conversation!</p>
            </div>
          ) : (
            messageGroups.map((group) => (
              <MessageGroupItem
                key={group.id}
                group={group}
                currentUserId={currentUserId}
                partnerLastReadMessageId={partnerLastReadMessageId}
              />
            ))
          )}

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Jump to bottom button */}
      {!isAtBottom && (
        <div className="absolute bottom-2 right-4 md:right-8 z-10 animate-in fade-in zoom-in-95 duration-200">
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-background border border-solid border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-muted relative"
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
