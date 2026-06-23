import { useState, useRef, useEffect } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import type { MessageGroup } from "@/modules/chat/utils/groupMessages";
import type { ConversationMember } from "@/modules/conversations/types/conversation";
import { MessageStatus } from "./MessageStatus";
import { MoreHorizontal, Pencil, Trash, Ban, Copy, Reply, Text, Pin } from "lucide-react";
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
import { useEditMessageMutation, useDeleteMessageMutation } from "@/modules/messages/hooks/useMessages";
import { usePinMessage, useUnpinMessage } from "@/modules/messages/hooks/usePinnedMessages";
import { Button } from "@/shared/components/ui/button";
import { stripMarkdown } from "@/shared/lib/utils";
import { scrollToMessage } from "@/shared/lib/dom";
import { PinButton } from "./PinButton";

interface MessageGroupItemProps {
  group: MessageGroup;
  currentUserId?: string | null;
  partnerLastReadMessageId?: string | null;
  members?: ConversationMember[];
  isChannel?: boolean;
  onReply?: (messageId: string, username: string, content: string) => void;
  pinnedMessageIds?: Set<string>;
  canPin?: boolean;
}

export function MessageGroupItem({ group, currentUserId, partnerLastReadMessageId, members, isChannel, onReply, pinnedMessageIds, canPin = true }: MessageGroupItemProps) {
  const { user, messages } = group;
  const conversationId = messages[0]?.conversationId;

  const editMutation = useEditMessageMutation(conversationId);
  const deleteMutation = useDeleteMessageMutation(conversationId);
  const pinMutation = usePinMessage(conversationId);
  const unpinMutation = useUnpinMessage(conversationId);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editInputRef.current.value.length;
    }
  }, [editingMessageId]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleEditStart = (msgId: string, content: string) => {
    setEditingMessageId(msgId);
    setEditContent(content);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleEditSave = () => {
    if (editingMessageId && editContent.trim()) {
      editMutation.mutate({ messageId: editingMessageId, content: editContent.trim() });
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const confirmDelete = () => {
    if (messageToDelete) {
      deleteMutation.mutate({ messageId: messageToDelete });
      setMessageToDelete(null);
    }
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    msgId: string;
    isMyMessage: boolean;
    isPinned: boolean;
    content: string;
    username: string;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent, msgId: string, isDel: boolean, isMyMsg: boolean, isPinned: boolean, content: string, username: string) => {
    if (isDel) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartPosRef.current) {
        setContextMenuPos({ x: touchStartPosRef.current.x, y: touchStartPosRef.current.y });
        setContextMenuTarget({ msgId, isMyMessage: isMyMsg, isPinned, content, username });
        setOpenMenuId(msgId);
      }
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleTouchEnd = () => {
    clearLongPress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current && longPressTimerRef.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearLongPress();
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string, isDel: boolean) => {
    if (!isDel) {
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setOpenMenuId(msgId);
    }
  };

  return (
    <>
      <div className="mt-3 mb-1.5">
        {messages.map((msg, index) => {
          const isFirst = index === 0;
          const isMyMessage = msg.userId === currentUserId;
          const isDeleted = !!msg.deletedAt;
          const isPinned = pinnedMessageIds?.has(msg.id) ?? false;

          const time = new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(msg.createdAt));

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`group/row flex hover:bg-message-hover px-4 md:px-6 animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out ${isFirst ? "pt-2.5 pb-0.5" : "py-0.5"} ${msg.optimistic || msg.pending ? "opacity-70" : ""}`}
              style={!isDeleted ? { WebkitTouchCallout: "none" } : undefined}
              onTouchStart={(e) => handleTouchStart(e, msg.id, isDeleted, isMyMessage, isPinned, msg.content, user?.username || "Unknown")}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
            >
              <div className="w-[36px] shrink-0 flex justify-center items-start relative select-none">
                {isFirst ? (
                  <UserAvatar
                    name={user?.username}
                    src={user?.avatarUrl}
                    className="h-9 w-9 mt-0.5 absolute left-0"
                    fallbackClassName="bg-primary/20 text-primary font-medium"
                  />
                ) : null}
              </div>

              <div className="flex-1 min-w-0 ml-2">
                {}
                {isFirst && msg.replyTo && !isDeleted && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors cursor-pointer w-fit group/reply"
                    onClick={() => scrollToMessage(msg.replyTo!.id)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      scrollToMessage(msg.replyTo!.id);
                    }}
                  >
                    <Reply className="h-3 w-3 shrink-0 rotate-180" />
                    <span className="font-semibold truncate max-w-[120px]">
                      {msg.replyTo.user?.username || "Unknown"}
                    </span>
                    <span className="truncate max-w-[200px] opacity-70">
                      {msg.replyTo.deletedAt ? (
                        <span className="italic">[Message deleted]</span>
                      ) : (
                        msg.replyTo.content
                      )}
                    </span>
                  </button>
                )}

                {isFirst && (
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="font-extrabold text-[15px] text-foreground">
                      {user?.username || "Deleted user"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 font-medium">
                      {time}
                    </span>
                    {isPinned && (
                      <Pin className="h-3 w-3 text-message-pinned fill-message-pinned ml-1" />
                    )}
                  </div>
                )}

                <div className="text-[15px] text-foreground whitespace-pre-wrap break-words leading-relaxed group/msg relative min-h-[22px]">
                  {}
                  {editingMessageId === msg.id && !isDeleted ? (
                    <div className="flex flex-col gap-2 w-full mt-1 mb-2">
                      <textarea
                        ref={editInputRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-background border rounded-md p-2 text-base focus:outline-none focus:ring-1 focus:ring-primary resize-none overflow-hidden min-h-[44px]"
                        rows={Math.max(1, editContent.split('\n').length)}
                      />
                      <div className="flex gap-2 text-xs">
                        <Button size="sm" variant="default" className="h-7 text-xs px-3" onClick={handleEditSave}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={handleEditCancel}>Cancel</Button>
                        <span className="text-muted-foreground mt-1 ml-1">escape to cancel • enter to save</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex-1 relative inline"
                        onContextMenu={(e) => {
                          handleContextMenu(e, msg.id, isDeleted);
                          if (!isDeleted) {
                            setContextMenuTarget({
                              msgId: msg.id,
                              isMyMessage,
                              isPinned,
                              content: msg.content,
                              username: user?.username || "Unknown",
                            });
                          }
                        }}
                      >
                        <span className={isDeleted ? "italic text-muted-foreground flex items-center gap-1.5" : "inline"}>
                          {isDeleted && <Ban className="h-3.5 w-3.5 inline-block mr-1" />}
                          {isDeleted ? (
                            <span className="italic text-muted-foreground">This message was deleted.</span>
                          ) : (
                            <>
                              {}
                              {!isFirst && msg.replyTo && !isDeleted && (
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors cursor-pointer w-fit group/reply"
                                  onClick={() => scrollToMessage(msg.replyTo!.id)}
                                  onTouchStart={(e) => {
                                    e.preventDefault();
                                  }}
                                  onTouchEnd={(e) => {
                                    e.preventDefault();
                                    scrollToMessage(msg.replyTo!.id);
                                  }}
                                >
                                  <Reply className="h-3 w-3 shrink-0 rotate-180" />
                                  <span className="font-semibold truncate max-w-[120px]">
                                    {msg.replyTo.user?.username || "Unknown"}
                                  </span>
                                  <span className="truncate max-w-[200px] opacity-70">
                                    {msg.replyTo.deletedAt ? (
                                      <span className="italic">[Message deleted]</span>
                                    ) : (
                                      msg.replyTo.content
                                    )}
                                  </span>
                                </button>
                              )}
                              <MarkdownRenderer content={msg.content} />
                            </>
                          )}
                          {msg.isEdited && !isDeleted && (
                            <span className="text-xs text-muted-foreground ml-2 align-middle leading-none">(edited)</span>
                          )}
                          {isMyMessage && !isDeleted && (
                            <span className="inline-flex items-center ml-1.5 align-middle leading-none">
                              <MessageStatus
                                messageId={msg.id}
                                isPending={msg.pending}
                                partnerLastReadMessageId={partnerLastReadMessageId}
                                readCount={isChannel && members ? computeReadCount(msg.id, currentUserId, members) : undefined}
                                isChannel={isChannel}
                              />
                            </span>
                          )}
                        </span>

                        {}
                        {!isDeleted && !msg.pending && !msg.optimistic && (
                          <div className="hidden md:inline-flex opacity-0 scale-95 group-hover/row:opacity-100 group-hover/row:scale-100 transition-all duration-150 absolute top-0 right-2 md:right-auto md:ml-2 bg-card border border-border/60 shadow-md rounded-lg z-10 items-center overflow-hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:ring-1 hover:ring-ring"
                              onClick={() => onReply?.(msg.id, user?.username || "Unknown", msg.content)}
                              title="Reply"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                            <PinButton
                              conversationId={conversationId}
                              messageId={msg.id}
                              isPinned={isPinned}
                              canPin={canPin}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:ring-1 hover:ring-ring"
                              onClick={() => navigator.clipboard.writeText(msg.content)}
                              title="Copy"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {isMyMessage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-none text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:ring-1 hover:ring-ring"
                                  onClick={() => handleEditStart(msg.id, msg.content)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:ring-1 hover:ring-ring"
                                  onClick={() => setMessageToDelete(msg.id)}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => onReply?.(msg.id, user?.username || "Unknown", msg.content)}>
                                  <Reply className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Reply</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(msg.content)}>
                                  <Copy className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(stripMarkdown(msg.content))}>
                                  <Text className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy as plain text</span>
                                </DropdownMenuItem>
                                {canPin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => isPinned ? unpinMutation.mutate(msg.id) : pinMutation.mutate(msg.id)}>
                                      <Pin className={`h-4 w-4 mr-2 ${isPinned ? "text-message-pinned" : ""}`} /> <span className="pt-[1px]">{isPinned ? "Unpin message" : "Pin message"}</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {isMyMessage && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => handleEditStart(msg.id, msg.content)}>
                                      <Pencil className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Edit Message</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => setMessageToDelete(msg.id)}>
                                      <Trash className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Delete Message</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}                        {}
                        {!isDeleted && !msg.pending && !msg.optimistic && (
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="absolute right-0 top-0 w-full h-full opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1} />
                              <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-48">
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => onReply?.(msg.id, user?.username || "Unknown", msg.content)}>
                                  <Reply className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Reply</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(msg.content)}>
                                  <Copy className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(stripMarkdown(msg.content))}>
                                  <Text className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy as plain text</span>
                                </DropdownMenuItem>
                                {canPin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => isPinned ? unpinMutation.mutate(msg.id) : pinMutation.mutate(msg.id)}>
                                      <Pin className={`h-4 w-4 mr-2 ${isPinned ? "text-message-pinned" : ""}`} /> <span className="pt-[1px]">{isPinned ? "Unpin message" : "Pin message"}</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {isMyMessage && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => handleEditStart(msg.id, msg.content)}>
                                      <Pencil className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Edit Message</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => setMessageToDelete(msg.id)}>
                                      <Trash className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Delete Message</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              <Trash className="h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      {openMenuId && contextMenuTarget && (
        <DropdownMenu
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setOpenMenuId(null);
              setContextMenuTarget(null);
            }
          }}
        >
          <DropdownMenuTrigger
            render={
              <button
                className="fixed z-50 opacity-0 pointer-events-none"
                style={{ left: contextMenuPos.x, top: contextMenuPos.y, width: 0, height: 0 }}
                tabIndex={-1}
                aria-hidden="true"
              />
            }
          />
          <DropdownMenuContent align="start" side="right" sideOffset={0} className="w-48">
            <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => {
              onReply?.(contextMenuTarget.msgId, contextMenuTarget.username, contextMenuTarget.content);
              setOpenMenuId(null);
              setContextMenuTarget(null);
            }}>
              <Reply className="h-4 w-4 mr-2" /> Reply
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => {
              navigator.clipboard.writeText(contextMenuTarget.content);
              setOpenMenuId(null);
              setContextMenuTarget(null);
            }}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => {
              navigator.clipboard.writeText(stripMarkdown(contextMenuTarget.content));
              setOpenMenuId(null);
              setContextMenuTarget(null);
            }}>
              <Text className="h-4 w-4 mr-2" /> Copy as plain text
            </DropdownMenuItem>
            {canPin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => {
                  if (contextMenuTarget.isPinned) {
                    unpinMutation.mutate(contextMenuTarget.msgId);
                  } else {
                    pinMutation.mutate(contextMenuTarget.msgId);
                  }
                  setOpenMenuId(null);
                  setContextMenuTarget(null);
                }}>
                  <Pin className={`h-4 w-4 mr-2 ${contextMenuTarget.isPinned ? "text-message-pinned" : ""}`} />
                  {contextMenuTarget.isPinned ? "Unpin message" : "Pin message"}
                </DropdownMenuItem>
              </>
            )}
            {contextMenuTarget.isMyMessage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => {
                  handleEditStart(contextMenuTarget.msgId, contextMenuTarget.content);
                  setOpenMenuId(null);
                  setContextMenuTarget(null);
                }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => {
                  setMessageToDelete(contextMenuTarget.msgId);
                  setOpenMenuId(null);
                  setContextMenuTarget(null);
                }}>
                  <Trash className="h-4 w-4 mr-2" /> Delete Message
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}


function computeReadCount(
  messageId: string,
  currentUserId: string | null | undefined,
  members: ConversationMember[]
): number {
  if (!currentUserId) return 0;

  return members.filter(
    (m) =>
      m.userId !== currentUserId &&
      m.lastReadMessageId &&
      m.lastReadMessageId >= messageId
  ).length;
}
