"use client";

import { useEffect, useRef, useState } from "react";
import { useThreadStore } from "../store/threadStore";
import { useThreadMessagesQuery } from "../hooks/useThreadMessages";
import { ThreadInput } from "./ThreadInput";
import { MarkdownRenderer } from "@/modules/messages/components/MarkdownRenderer";
import { MessageStatus } from "@/modules/messages/components/MessageStatus";
import { EditMessageForm } from "@/modules/messages/components/EditMessageForm";
import { useEditMessageMutation } from "@/modules/messages/hooks/useMessages";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { ArrowLeft, Pencil } from "lucide-react";
import { ThreadIcon } from "@/shared/components/ui/thread-icon";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { User } from "@/modules/conversations/types/conversation";

interface ThreadPanelProps {
  conversationId: string;
  currentUser?: User;
  onBack?: () => void;
}

function threadTitle(rootMessage: { content?: string } | undefined): string {
  if (!rootMessage?.content) return "Thread";
  const stripped = rootMessage.content.replace(/[#*`~>\[\]_|-]/g, "").trim();
  return stripped.length > 60 ? stripped.slice(0, 60) + "…" : stripped;
}

export function ThreadPanel({ conversationId, currentUser, onBack }: ThreadPanelProps) {
  const { activeThreadRootId, threadData, setThreadData } = useThreadStore();
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const editMutation = useEditMessageMutation(conversationId);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);

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

  const handleEditSave = (content: string) => {
    if (editingReplyId && content.trim()) {
      editMutation.mutate({
        messageId: editingReplyId,
        content: content.trim(),
        threadRootId: activeThreadRootId,
      });
      setEditingReplyId(null);
    }
  };

  const handleEditCancel = () => {
    setEditingReplyId(null);
  };

  if (!activeThreadRootId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center px-4">
          <ThreadIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Select a message to view its thread</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
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
          const rootDate = new Date(rootMessage.createdAt);
          const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
          
          return (
            <>
              <div className="px-5 py-4 border-b border-border/40 bg-card shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  {onBack && (
                    <button 
                      onClick={onBack}
                      className="p-1 -ml-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                      title="Back to Threads"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <h3 className="text-[17px] font-bold text-foreground truncate">{threadTitle(rootMessage)}</h3>
                </div>
                <div className="text-[13px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground">{replies.length} replies</span>
                  <span className="opacity-50">•</span>
                  <span>Started by {rootMessage.user?.username || "Deleted user"}</span>
                  {lastReply && (
                    <>
                      <span className="opacity-50">•</span>
                      <span>
                        Last reply {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(lastReply.createdAt))}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="pb-2">
                <div className="relative px-5 pt-5 pb-4">
                  {replies.length > 0 && (
                    <div className="absolute left-[39px] top-[54px] bottom-0 w-[2px] bg-muted-foreground/40 z-0" />
                  )}
                  <div className={cn("flex gap-3 relative z-10", isPending && "opacity-70")}>
                    <div className="flex justify-center w-10 shrink-0 relative z-10">
                      <UserAvatar
                        name={rootMessage.user?.username}
                        src={rootMessage.user?.avatarUrl}
                        className="h-8 w-8 shrink-0 mt-0.5 shadow-sm"
                        fallbackClassName="bg-primary/20 text-primary font-medium text-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-bold text-[14px] text-foreground">
                          {rootMessage.user?.username || "Deleted user"}
                        </span>
                        <span className="text-[11px] text-muted-foreground/80 font-medium">
                          {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(rootDate)}
                        </span>
                      </div>
                      <div className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                        {rootMessage.deletedAt ? (
                          <span className="italic text-muted-foreground/70">This thread was deleted.</span>
                        ) : (
                          <MarkdownRenderer content={rootMessage.content} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  {replies.map((reply, index) => {
                    const isPending = reply.pending || reply.optimistic;
                    return (
                      <div
                        key={reply.id}
                        className={cn(
                          "group flex gap-3 px-5 py-2 hover:bg-foreground/5 transition-colors relative",
                          isPending && "opacity-70"
                        )}
                      >
                        {/* Top line to avatar */}
                        <div className="absolute left-[39px] top-0 h-[10px] w-[2px] bg-muted-foreground/40 z-0" />
                        
                        {/* Bottom line to next reply */}
                        {index !== replies.length - 1 && (
                          <div className="absolute left-[39px] top-[42px] bottom-0 w-[2px] bg-muted-foreground/40 z-0" />
                        )}

                        <div className="flex justify-center w-10 shrink-0 relative z-10">
                          <UserAvatar
                            name={reply.user?.username}
                            src={reply.user?.avatarUrl}
                            className="h-8 w-8 mt-0.5 shrink-0 shadow-sm"
                            fallbackClassName="bg-primary/20 text-primary font-medium text-xs"
                          />
                        </div>
                          <div className="flex-1 min-w-0 relative z-10">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-bold text-[14px] text-foreground">
                              {reply.user?.username || "Deleted user"}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80 font-medium inline-flex items-center gap-1">
                              {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(reply.createdAt))}
                              {isPending && (
                                <MessageStatus
                                  messageId={reply.id}
                                  isPending={true}
                                />
                              )}
                            </span>
                          </div>
                          <div className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                            {editingReplyId === reply.id ? (
                              <EditMessageForm
                                initialContent={reply.content}
                                onSave={handleEditSave}
                                onCancel={handleEditCancel}
                              />
                            ) : reply.deletedAt ? (
                              <span className="italic text-muted-foreground/70">This message was deleted.</span>
                            ) : (
                              <MarkdownRenderer content={reply.content} />
                            )}
                          </div>
                          {!reply.deletedAt && !isPending && editingReplyId !== reply.id && currentUser?.id === reply.userId && (
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                onClick={() => setEditingReplyId(reply.id)}
                                title="Edit message"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={repliesEndRef} className="h-4" />
                </div>
              </div>
            </>
          );
        })()}
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
