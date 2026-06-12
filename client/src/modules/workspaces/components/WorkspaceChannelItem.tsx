"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreVertical, Edit2, Trash2, Hash, Lock, Globe, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDeleteChannel, useUpdateChannel } from "../hooks/useWorkspaces";
import { useWorkspaceChannelsQuery } from "../hooks/useWorkspaceChannels";
import type { Conversation } from "@/modules/conversations/types/conversation";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface WorkspaceChannelItemProps {
  channel: Conversation;
  isActive: boolean;
  workspaceId: string;
  canManage: boolean;
  isGeneral: boolean;
  onNavigate?: () => void;
}

export function WorkspaceChannelItem({ channel, isActive, workspaceId, canManage, isGeneral, onNavigate }: WorkspaceChannelItemProps) {
  const unreadCount = channel.unreadCount || 0;
  const isUnread = unreadCount > 0;
  const { data: channels } = useWorkspaceChannelsQuery(workspaceId);
  const { mutate: deleteChannel, isPending: isDeleting } = useDeleteChannel();
  const { mutate: updateChannel, isPending: isUpdating } = useUpdateChannel();
  const router = useRouter();

  const [modalType, setModalType] = useState<"rename" | "delete" | "visibility" | null>(null);
  const [renameValue, setRenameValue] = useState(channel.name || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeModals = () => {
    setModalType(null);
    setRenameValue(channel.name || "");
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameValue(channel.name || "");
    setModalType("rename");
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType("delete");
  };

  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType("visibility");
  };

  const confirmDelete = () => {
    deleteChannel({ workspaceId, channelId: channel.id }, {
      onSuccess: () => {
        closeModals();
        if (isActive) {
          const generalChannel = channels?.find(c => c.name === "general");
          if (generalChannel) {
            router.push(`/workspaces/${workspaceId}/channels/${generalChannel.id}`);
          } else {
            router.push(`/workspaces/${workspaceId}`);
          }
        }
      }
    });
  };

  const confirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renameValue && renameValue.trim() !== channel.name) {
      let channelName = renameValue.trim().toLowerCase().replace(/\s+/g, "-");
      updateChannel({ workspaceId, channelId: channel.id, data: { name: channelName } }, {
        onSuccess: () => closeModals()
      });
    } else {
      closeModals();
    }
  };

  const confirmVisibility = () => {
    const newVisibility = channel.visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE";
    updateChannel({ workspaceId, channelId: channel.id, data: { visibility: newVisibility } }, {
      onSuccess: () => closeModals()
    });
  };

  const renderModals = () => {
    if (!mounted || !modalType) return null;

    if (modalType === "rename") {
      return createPortal(
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Rename Channel</h2>
              <button onClick={closeModals} className="p-1 hover:bg-muted rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={confirmRename} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rename-channel">Channel Name</Label>
                  <Input
                    id="rename-channel"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    maxLength={30}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-6">
                  <Button type="button" variant="ghost" onClick={closeModals} disabled={isUpdating}>Cancel</Button>
                  <Button type="submit" disabled={!renameValue.trim() || renameValue.trim() === channel.name || isUpdating}>
                    {isUpdating ? "Saving..." : "Rename"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    if (modalType === "delete") {
      return createPortal(
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Delete Channel</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete #{channel.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeModals} disabled={isDeleting}>Cancel</Button>
                <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    if (modalType === "visibility") {
      const newVisibility = channel.visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE";
      return createPortal(
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Change Visibility</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to make #{channel.name} {newVisibility.toLowerCase()}?
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeModals} disabled={isUpdating}>Cancel</Button>
                <Button type="button" onClick={confirmVisibility} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    return null;
  };

  return (
    <>
      <Link
        href={`/workspaces/${workspaceId}/channels/${channel.id}`}
        prefetch={false}
      onClick={() => onNavigate?.()}
      className={`group flex items-center justify-between px-2 py-2 rounded-md transition-colors ${isActive
        ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-foreground"
        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/5"
        }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {channel.visibility === "PRIVATE" ? (
          <Lock className="h-4 w-4 shrink-0 opacity-70" />
        ) : (
          <Hash className="h-4 w-4 shrink-0 opacity-70" />
        )}
        <span className={`truncate text-sm leading-none ${isUnread && !isActive ? 'font-bold text-foreground' : 'font-medium'}`}>
          {channel.name}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isUnread && !isActive && (
          <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[12px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-none ${isActive ? 'opacity-100' : ''}`}>
            <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border shadow-md">
            <DropdownMenuItem onClick={handleRenameClick} className="cursor-pointer">
              <Edit2 className="h-4 w-4 mr-2" />
              Rename Channel
            </DropdownMenuItem>
            {!isGeneral && canManage && (
              <>
                <DropdownMenuItem onClick={handleVisibilityClick} className="cursor-pointer">
                  {channel.visibility === "PRIVATE" ? (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Make Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Make Private
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Channel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </Link>
      {renderModals()}
    </>
  );
}
