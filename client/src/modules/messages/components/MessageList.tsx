"use client";

import { useEffect } from "react";
import { useMessagesInfiniteQuery } from "@/modules/messages/hooks/useMessages";
import { useMarkConversationReadMutation } from "@/modules/conversations/hooks/useConversations";
import { useMessageScroll } from "@/modules/chat/hooks/useMessageScroll";
import { MessageGroupItem } from "./MessageGroupItem";
import { groupMessages } from "@/modules/chat/utils/groupMessages";
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
  }, [conversationId, latestMessageId, markRead, myLastReadMessageId, isLatestMessageMine, latestMessage?.pending]);



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
