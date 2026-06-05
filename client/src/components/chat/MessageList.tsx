import { useEffect, useRef, useCallback } from "react";
import { useMessagesInfiniteQuery } from "@/hooks/useMessages";
import { useMarkConversationReadMutation } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageListProps {
  conversationId: string;
  currentUserId: string | null;
}

export function MessageList({ conversationId, currentUserId }: MessageListProps) {
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
  const messages = data?.pages.flatMap((page) => page?.data || []).reverse() || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div ref={observerTarget} className="h-4 w-full flex justify-center">
        {isFetchingNextPage && <span className="text-xs text-muted-foreground">Loading older messages...</span>}
      </div>

      {messages.length === 0 ? (
        <div className="text-left text-muted-foreground pt-10 text-xs">
          <p>No messages parsed.</p>
          <p className="mt-4 font-bold">Raw TanStack Query Data:</p>
          <pre className="bg-muted p-2 rounded mt-2 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        messages.map((message) => {
          const isMe = message.userId === currentUserId || message.userId === "me";

          return (
            <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
              <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={message.user?.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">{message.user?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`px-4 py-1.5 rounded-2xl ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  } ${message.optimistic ? "opacity-70" : ""}`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
