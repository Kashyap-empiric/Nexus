"use client";

import { useEffect, useRef } from "react";
import { useThreadStore } from "../store/threadStore";
import { useThreadMessagesQuery } from "../hooks/useThreadMessages";
import { ThreadInput } from "./ThreadInput";
import { MarkdownRenderer } from "@/modules/messages/components/MarkdownRenderer";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { MessageSquare } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { User } from "@/modules/conversations/types/conversation";

interface ThreadPanelProps {
  conversationId: string;
  currentUser?: User;
}

export function ThreadPanel({ conversationId, currentUser }: ThreadPanelProps) {
  const { activeThreadRootId, threadData, setThreadData } = useThreadStore();
  const repliesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useThreadMessagesQuery(
    conversationId,
    activeThreadRootId,
  );

  useEffect(() => {
    if (data) {
      setThreadData(data);
    }
  }, [data, setThreadData]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData?.replies.length]);

  const rootMessage = threadData?.root;
  const replies = threadData?.replies ?? [];

  if (!activeThreadRootId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center px-4">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Select a message to view its thread</p>
        </div>
      </div>
    );
  }

  const lastReplyAt = replies.length > 0 ? replies[replies.length - 1].createdAt : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {rootMessage && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-bold text-foreground leading-none">Thread</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
              {rootMessage.user?.username && (
                <>
                  <span aria-hidden>·</span>
                  <span>Started by {rootMessage.user.username}</span>
                </>
              )}
              {lastReplyAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Last reply{" "}
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(lastReplyAt))}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading thread...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-12 text-sm text-destructive">
            Failed to load thread. Try again.
          </div>
        )}

        {rootMessage && (() => {
          const isPending = rootMessage.pending || rootMessage.optimistic;
          return (
            <div className="px-4 pt-4 pb-3 border-b">
              <div className={cn("flex gap-2.5", isPending && "opacity-70")}>
                <UserAvatar
                  name={rootMessage.user?.username}
                  src={rootMessage.user?.avatarUrl}
                  className="h-8 w-8 mt-0.5 shrink-0"
                  fallbackClassName="bg-primary/20 text-primary font-medium text-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-sm text-foreground">
                      {rootMessage.user?.username || "Deleted user"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(rootMessage.createdAt))}
                    </span>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {rootMessage.deletedAt ? (
                      <span className="italic text-muted-foreground/70">This thread was deleted.</span>
                    ) : (
                      <MarkdownRenderer content={rootMessage.content} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="px-4 py-2">
          {replies.map((reply) => {
            const isPending = reply.pending || reply.optimistic;
            return (
              <div
                key={reply.id}
                className={cn(
                  "flex gap-2.5 py-2",
                  isPending && "opacity-70"
                )}
              >
                <UserAvatar
                  name={reply.user?.username}
                  src={reply.user?.avatarUrl}
                  className="h-7 w-7 mt-0.5 shrink-0"
                  fallbackClassName="bg-primary/20 text-primary font-medium text-[10px]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-sm text-foreground">
                      {reply.user?.username || "Deleted user"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(reply.createdAt))}
                    </span>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {reply.deletedAt ? (
                      <span className="italic text-muted-foreground/70">This message was deleted.</span>
                    ) : (
                      <MarkdownRenderer content={reply.content} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={repliesEndRef} />
        </div>
      </div>

      {(!rootMessage || !rootMessage.deletedAt) && (
        <ThreadInput
          conversationId={conversationId}
          threadRootId={activeThreadRootId}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
