"use client";

import { useEffect, useRef } from "react";
import { useMessagesInfiniteQuery } from "../hooks/useMessages";
import { useMarkConversationReadMutation } from "../hooks/useConversations";
import { MessageGroupItem } from "./MessageGroupItem";
import { groupMessages } from "../utils/groupMessages";

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useMessagesInfiniteQuery(conversationId);
  const { mutate: markRead } = useMarkConversationReadMutation();
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasMarkedReadFor = useRef<string | null>(null);

  const latestMessageId = data?.pages?.[0]?.data?.[0]?.id;

  // Auto-scroll to bottom on conversation change or new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestMessageId, conversationId]); // Scroll when the newest message changes or conversation changes

  // Mark conversation as read when entering (restricted to fire once per conversation load to avoid noisy pagination updates)
  useEffect(() => {
    if (!latestMessageId || hasMarkedReadFor.current === conversationId) return;

    markRead({
      conversationId,
      messageId: latestMessageId,
    });
    hasMarkedReadFor.current = conversationId;
  }, [conversationId, latestMessageId, markRead]);

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
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading messages...</div>;
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-4">
        <p className="font-bold">Error fetching messages:</p>
        <pre className="text-sm bg-red-50/10 p-2 mt-2 rounded">{(error as Error)?.message || "Unknown error"}</pre>
      </div>
    );
  }

  // Flatten and reverse so oldest is at the top
  const rawMessages = data?.pages.flatMap((page) => page?.data || []).reverse() || [];
  const messageGroups = groupMessages(rawMessages);

  return (
    <div className="flex-1 overflow-y-auto pb-4 pt-2">
      <div className="w-full px-4 md:px-6">
        <div ref={observerTarget} className="h-4 w-full flex justify-center">
          {isFetchingNextPage && <span className="text-xs text-muted-foreground">Loading older messages...</span>}
        </div>

        {messageGroups.length === 0 ? (
          <div className="text-center text-muted-foreground pt-10 text-sm">
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <MessageGroupItem key={group.id} group={group} />
          ))
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
