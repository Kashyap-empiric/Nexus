import { useState, useRef, useEffect } from "react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import type { MessageGroup } from "../utils/groupMessages";
import { MessageStatus } from "./MessageStatus";
import { MoreHorizontal, Pencil, Trash, Ban, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useEditMessageMutation, useDeleteMessageMutation } from "../hooks/useMessages";
import { Button } from "@/shared/components/ui/button";

interface MessageGroupItemProps {
  group: MessageGroup;
  currentUserId?: string | null;
  partnerLastReadMessageId?: string | null;
}

export function MessageGroupItem({ group, currentUserId, partnerLastReadMessageId }: MessageGroupItemProps) {
  const { user, messages } = group;
  const conversationId = messages[0]?.conversationId;

  const editMutation = useEditMessageMutation(conversationId);
  const deleteMutation = useDeleteMessageMutation(conversationId);

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

  const handleContextMenu = (e: React.MouseEvent, msgId: string, isMyMsg: boolean, isDel: boolean) => {
    if (isMyMsg && !isDel) {
      e.preventDefault();
      setOpenMenuId(msgId);
    }
  };

  return (
    <>
      <div className="mt-2 mb-1">
        {messages.map((msg, index) => {
          const isFirst = index === 0;
          const isMyMessage = msg.userId === currentUserId;
          const isDeleted = !!msg.deletedAt;

          const time = new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(msg.createdAt));

          return (
            <div
              key={msg.id}
              className={`group/row flex hover:bg-black/10 dark:hover:bg-white/10 px-[15px] md:px-4 animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out ${isFirst ? "pt-2 pb-0.5" : "py-0.5"} ${msg.optimistic || msg.pending ? "opacity-70" : ""}`}
            >
              <div className="w-[36px] shrink-0 flex justify-center items-start relative select-none">
                {isFirst ? (
                  <UserAvatar 
                    name={user?.username}
                    src={user?.avatarUrl}
                    className="h-9 w-9 mt-0.5 absolute left-0"
                    fallbackClassName="bg-primary/20 text-primary font-medium"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover/row:opacity-100 mt-[5px] absolute right-2 leading-none">
                    {time}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 ml-2">
                {isFirst && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-foreground hover:underline cursor-pointer leading-none">
                      {user?.username || "Deleted user"}
                    </span>
                    <span className="text-xs text-muted-foreground leading-none">
                      {time}
                    </span>

                  </div>
                )}

                <div className="text-base text-foreground whitespace-pre-wrap break-words leading-relaxed flex items-center justify-between group/msg relative min-h-[22px]">
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
                        className="flex-1 relative" 
                        onContextMenu={(e) => handleContextMenu(e, msg.id, isMyMessage, isDeleted)}
                      >
                        <span className={isDeleted ? "italic text-muted-foreground flex items-center gap-1.5" : ""}>
                          {isDeleted && <Ban className="h-3.5 w-3.5 inline-block mr-1" />}
                          {isDeleted ? "This message was deleted." : msg.content}
                          {msg.isEdited && !isDeleted && (
                            <span className="text-xs text-muted-foreground ml-2">(edited)</span>
                          )}
                        </span>
                        
                        {isMyMessage && !isDeleted && !msg.pending && !msg.optimistic && (
                          <div className="hidden md:inline-flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute right-2 md:right-auto md:ml-2 -translate-y-1.5 bg-background border shadow-sm rounded-md z-10 items-center">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => handleEditStart(msg.id, msg.content)}>
                                  <Pencil className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Edit Message</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(msg.content)}>
                                  <Copy className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy Text</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => setMessageToDelete(msg.id)}>
                                  <Trash className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Delete Message</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        {/* Mobile dropdown menu (hidden trigger, triggered by state) */}
                        {isMyMessage && !isDeleted && !msg.pending && !msg.optimistic && (
                           <div className="md:hidden">
                             <DropdownMenu open={openMenuId === msg.id} onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}>
                               <DropdownMenuTrigger className="absolute right-0 top-0 w-full h-full opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1} />
                               <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-40">
                                 <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => handleEditStart(msg.id, msg.content)}>
                                   <Pencil className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Edit Message</span>
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="flex items-center cursor-pointer" onClick={() => navigator.clipboard.writeText(msg.content)}>
                                   <Copy className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Copy Text</span>
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center cursor-pointer" onClick={() => setMessageToDelete(msg.id)}>
                                   <Trash className="h-4 w-4 mr-2" /> <span className="pt-[1px]">Delete Message</span>
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                        )}
                      </div>
                      
                      <div className="flex items-center ml-2 shrink-0">
                        {isMyMessage && !isDeleted && (
                          <MessageStatus
                            messageId={msg.id}
                            isPending={msg.pending}
                            partnerLastReadMessageId={partnerLastReadMessageId}
                            className=""
                          />
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
