"use client";

import { useEffect, useRef, useState } from "react";
import { useThreadStore } from "../store/threadStore";
import { useThreadMessagesQuery } from "../hooks/useThreadMessages";
import { ThreadInput } from "./ThreadInput";
import { MarkdownRenderer } from "@/modules/messages/components/MarkdownRenderer";
import { EditMessageForm } from "@/modules/messages/components/EditMessageForm";
import { useEditMessageMutation, useDeleteMessageMutation } from "@/modules/messages/hooks/useMessages";
import { groupMessages } from "@/modules/chat/utils/groupMessages";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { ArrowLeft, Copy, MoreHorizontal, Pencil, Text, Trash } from "lucide-react";
import { ThreadIcon } from "@/shared/components/ui/thread-icon";
import { cn, stripMarkdown } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
  const deleteMutation = useDeleteMessageMutation(conversationId);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const confirmDelete = () => {
    if (messageToDelete) {
      deleteMutation.mutate({
        messageId: messageToDelete,
        threadRootId: activeThreadRootId,
      });
      setMessageToDelete(null);
    }
  };

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
  const replyGroups = groupMessages(replies);
  const flatReplies = replyGroups.flatMap((g) => g.messages);

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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onBack}
                      className="h-8 w-8 -ml-2 mr-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Back to Threads"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
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
                <div className="relative px-4 md:px-6 pt-5 pb-4">
                  {replies.length > 0 && (
                    <div className="absolute left-[34px] md:left-[42px] top-[54px] bottom-0 w-[2px] bg-muted-foreground/40 z-0" />
                  )}
                  <div className={cn("flex relative z-10", isPending && "opacity-70")}>
                    <div className="w-[36px] shrink-0 flex justify-center items-start relative z-10">
                      <UserAvatar
                        name={rootMessage.user?.username}
                        src={rootMessage.user?.avatarUrl}
                        className="h-9 w-9 shrink-0 mt-0.5 shadow-sm"
                        fallbackClassName="bg-primary/20 text-primary font-medium text-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0 ml-2">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="font-extrabold text-[15px] text-foreground">
                          {rootMessage.user?.username || "Deleted user"}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 font-medium">
                          {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(rootDate)}
                        </span>
                      </div>
                      <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
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
                  {replyGroups.flatMap((group) =>
                    group.messages.map((reply, gi) => {
                      const isFirst = gi === 0;
                      const isPending = reply.pending || reply.optimistic;
                      const flatIdx = flatReplies.indexOf(reply);
                      const isLast = flatIdx === flatReplies.length - 1;
                      const isMyMessage = reply.userId === currentUser?.id;
                      const connectorLeft = "left-[34px] md:left-[42px]";
                      return (
                        <div
                          key={reply.id}
                          id={`thread-msg-${reply.id}`}
                          className={cn(
                            "group/row flex hover:bg-foreground/5 px-4 md:px-6 transition-colors relative",
                            isFirst ? "pt-2.5 pb-0.5" : "py-0.5",
                            isPending && "opacity-70"
                          )}
                        >
                          {!isLast && (
                            <>
                              <div className={`absolute ${connectorLeft} top-0 h-[10px] w-[2px] bg-muted-foreground/40 z-0`} />
                              <div className={`absolute ${connectorLeft} bottom-0 w-[2px] bg-muted-foreground/40 z-0 ${isFirst ? "top-[42px]" : "top-[10px]"}`} />
                            </>
                          )}
                          {isLast && isFirst && (
                            <div className={`absolute ${connectorLeft} top-0 h-[30px] w-[2px] bg-muted-foreground/40 z-0`} />
                          )}
                          {isLast && !isFirst && (
                            <div className={`absolute ${connectorLeft} top-0 w-6 bottom-2/5 border-l-[2px] border-b-[2px] border-muted-foreground/40 rounded-bl-lg z-0`} />
                          )}

                          <div className="w-[36px] shrink-0 flex justify-center items-start relative z-10 select-none">
                            {isFirst ? (
                              <UserAvatar
                                name={reply.user?.username}
                                src={reply.user?.avatarUrl}
                                className="h-9 w-9 mt-0.5 shrink-0 shadow-sm"
                                fallbackClassName="bg-primary/20 text-primary font-medium text-xs"
                              />
                            ) : (
                              <span className="mt-1.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 ml-2 relative z-10">
                            {isFirst && (
                              <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="font-extrabold text-[15px] text-foreground">
                                  {reply.user?.username || "Deleted user"}
                                </span>
                                <span className="text-[11px] text-muted-foreground/60 font-medium">
                                  {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(reply.createdAt))}
                                </span>
                              </div>
                            )}
                            <div className="text-[15px] text-foreground whitespace-pre-wrap break-words leading-relaxed group/msg relative min-h-[22px]">
                              {editingReplyId === reply.id && !reply.deletedAt ? (
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

                              {!reply.deletedAt && !isPending && (
                                <div className="hidden md:inline-flex opacity-0 scale-95 group-hover/row:opacity-100 group-hover/row:scale-100 transition-all duration-150 absolute top-0 right-0 bg-card border border-border/60 shadow-md rounded-lg z-50 items-center overflow-hidden">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                    onClick={() => navigator.clipboard.writeText(reply.content)}
                                    title="Copy"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>

                                  {isMyMessage && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                        onClick={() => setEditingReplyId(reply.id)}
                                        title="Edit"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none text-muted-foreground hover:text-destructive hover:bg-accent/60"
                                        onClick={() => setMessageToDelete(reply.id)}
                                        title="Delete"
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60" title="More actions" />}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(reply.content)}>
                                        <Copy className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(stripMarkdown(reply.content))}>
                                        <Text className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy as plain text</span>
                                      </DropdownMenuItem>
                                      {isMyMessage && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => setEditingReplyId(reply.id)}>
                                            <Pencil className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Edit Message</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => setMessageToDelete(reply.id)}>
                                            <Trash className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Delete Message</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={repliesEndRef} className="h-4" />
                </div>
                {messageToDelete && (
                  <AlertDialog open={true} onOpenChange={() => setMessageToDelete(null)}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia>
                          <Trash className="h-5 w-5 text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete message?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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