import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
}

export function MessageGroupItem({ group, currentUserId, partnerLastReadMessageId, members, isChannel, onReply, pinnedMessageIds }: MessageGroupItemProps) {
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

  const handleContextMenu = (e: React.MouseEvent, msgId: string, isDel: boolean) => {
    if (!isDel) {
      e.preventDefault();
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
              className={`group/row flex hover:bg-black/[0.06] dark:hover:bg-white/[0.06] px-4 md:px-6 animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out ${isFirst ? "pt-2.5 pb-0.5" : "py-0.5"} ${msg.optimistic || msg.pending ? "opacity-70" : ""}`}
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
                {/* Reply quote block — shown above the username for the first message */}
                {isFirst && msg.replyTo && !isDeleted && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors cursor-pointer w-fit group/reply"
                    onClick={() => scrollToMessage(msg.replyTo!.id)}
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
                    <span className="font-extrabold text-[15px] text-foreground hover:text-brand hover:underline cursor-pointer transition-colors">
                      <Link href={`/users/${user?.id}`}>{user?.username || "Deleted user"}</Link>
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 font-medium">
                      {time}
                    </span>
                    {isPinned && (
                      <Pin className="h-3 w-3 text-amber-500 fill-amber-500 ml-1" />
                    )}
                  </div>
                )}

                <div className="text-[15px] text-foreground whitespace-pre-wrap break-words leading-relaxed group/msg relative min-h-[22px] max-w-[min(100%,700px)]">
                  {/* !isDeleted prevents stuck edit states during concurrent multi-device deletions or rapid click race conditions */}
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
                        onContextMenu={(e) => handleContextMenu(e, msg.id, isDeleted)}
                      >
                        <span className={isDeleted ? "italic text-muted-foreground flex items-center gap-1.5" : "inline"}>
                          {isDeleted && <Ban className="h-3.5 w-3.5 inline-block mr-1" />}
                          {isDeleted ? (
                            <span className="italic text-muted-foreground">This message was deleted.</span>
                          ) : (
                            <>
                              {/* Reply quote block — for non-first messages (no username header above) */}
                              {!isFirst && msg.replyTo && !isDeleted && (
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors cursor-pointer w-fit group/reply"
                                  onClick={() => scrollToMessage(msg.replyTo!.id)}
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

                        {/* Desktop hover actions: Reply + Copy for everyone; Edit/Delete/More for own messages */}
                        {!isDeleted && !msg.pending && !msg.optimistic && (
                          <div className="hidden md:inline-flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute right-2 md:right-auto md:ml-2 -translate-y-1.5 bg-background border shadow-sm rounded-md z-10 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => onReply?.(msg.id, user?.username || "Unknown", msg.content)}
                              title="Reply"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                            <PinButton
                              conversationId={conversationId}
                              messageId={msg.id}
                              isPinned={isPinned}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleEditStart(msg.id, msg.content)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => isPinned ? unpinMutation.mutate(msg.id) : pinMutation.mutate(msg.id)}>
                                    <Pin className={`h-4 w-4 mr-2 ${isPinned ? "text-amber-500" : ""}`} /> <span className="pt-[1px]">{isPinned ? "Unpin message" : "Pin message"}</span>
                                  </DropdownMenuItem>
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
                        {/* Mobile dropdown: Reply, Copy, Pin, Edit/Delete for own messages */}
                        {!isDeleted && !msg.pending && !msg.optimistic && (
                           <div className="md:hidden">
                             <DropdownMenu open={openMenuId === msg.id} onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}>
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
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => isPinned ? unpinMutation.mutate(msg.id) : pinMutation.mutate(msg.id)}>
                                   <Pin className={`h-4 w-4 mr-2 ${isPinned ? "text-amber-500" : ""}`} /> <span className="pt-[1px]">{isPinned ? "Unpin message" : "Pin message"}</span>
                                 </DropdownMenuItem>
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
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
            <AlertDialogCancel variant="ghost" className="flex-1 sm:flex-none mt-0 hover:bg-white/5">
              <span className="pt-[1px]">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="flex-1 sm:flex-none bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              <Trash className="h-3.5 w-3.5" />
              <span className="pt-[1px]">Delete</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Count how many channel members (excluding the current user) have read a message.
 * A member is considered to have read the message if their lastReadMessageId
 * is greater than or equal to the message's ID (messages use UUIDv7 which sorts chronologically).
 */
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
