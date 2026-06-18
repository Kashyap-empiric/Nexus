"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Edit2, Trash2, Hash, Lock, Globe, Users, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { useDeleteChannel, useUpdateChannel } from "../hooks/useWorkspaces";
import { useRemoveChannelMemberMutation } from "../hooks/useChannelMembers";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useWorkspaceChannelsQuery } from "../hooks/useWorkspaceChannels";
import type { Conversation } from "@/modules/conversations/types/conversation";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ManageChannelMembersModal } from "./ManageChannelMembersModal";
import { ChannelSettingsModal } from "@/modules/conversations/components/ChannelSettingsModal";

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
  const { mutate: leaveChannel, isPending: isLeaving } = useRemoveChannelMemberMutation();
  const currentUser = useUser();
  const router = useRouter();

  const [modalType, setModalType] = useState<"rename" | "delete" | "visibility" | "members" | "settings" | "leave" | null>(null);
  const [renameValue, setRenameValue] = useState(channel.name || "");

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

  const handleManageMembersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType("members");
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType("settings");
  };

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType("leave");
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

  const confirmLeave = () => {
    if (!currentUser?.id) return;
    leaveChannel(
      { workspaceId, channelId: channel.id, userId: currentUser.id },
      {
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
        },
      }
    );
  };

  const handleCloseModal = (open: boolean) => {
    if (!open) closeModals();
  };

  return (
    <>
      <Link
        href={`/workspaces/${workspaceId}/channels/${channel.id}`}
        prefetch={false}
      onClick={() => onNavigate?.()}
      className={`group flex items-center justify-between px-2 py-2 rounded-md transition-colors ${isActive
        ? "bg-brand/10 text-brand dark:bg-brand/10 dark:text-brand"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {channel.visibility === "PRIVATE" ? (
          <Lock className="h-4 w-4 shrink-0 opacity-70" />
        ) : (
          <Hash className="h-4 w-4 shrink-0 opacity-70" />
        )}
        <span className={`truncate text-sm leading-snug ${isUnread && !isActive ? 'font-bold text-foreground' : 'font-medium'}`}>
          {channel.name}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isUnread && !isActive && (
          <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-white text-[12px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-none ${isActive ? 'opacity-100' : ''}`}>
            <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border shadow-md">
            <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Channel Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRenameClick} className="cursor-pointer">
              <Edit2 className="h-4 w-4 mr-2" />
              Rename Channel
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem onClick={handleManageMembersClick} className="cursor-pointer">
                <Users className="h-4 w-4 mr-2" />
                Manage Members
              </DropdownMenuItem>
            )}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive focus:text-destructive cursor-pointer">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Channel
                </DropdownMenuItem>
              </>
            )}
            {!isGeneral && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLeaveClick} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Channel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </Link>

      {/* Rename Dialog */}
      <Dialog open={modalType === "rename"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Rename Channel</DialogTitle>
            <DialogDescription>
              Give this channel a new name for everyone.
            </DialogDescription>
          </DialogHeader>
          <form id="rename-channel-form" onSubmit={confirmRename}>
            <DialogBody>
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
            </DialogBody>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeModals} disabled={isUpdating}>Cancel</Button>
            <Button type="submit" form="rename-channel-form" disabled={!renameValue.trim() || renameValue.trim() === channel.name || isUpdating}>
              {isUpdating ? "Saving..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={modalType === "delete"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete #{channel.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              All messages in this channel will be permanently deleted. This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeModals} disabled={isDeleting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <ManageChannelMembersModal
        workspaceId={workspaceId}
        channelId={channel.id}
        open={modalType === "members"}
        onOpenChange={handleCloseModal}
      />

      {/* Visibility Dialog */}
      <Dialog open={modalType === "visibility"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Change Visibility</DialogTitle>
            <DialogDescription>
              Are you sure you want to make #{channel.name} {channel.visibility === "PRIVATE" ? "public" : "private"}?
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {channel.visibility === "PRIVATE"
                ? "Anyone in the workspace will be able to see and join this channel."
                : "Only current members will be able to see this channel. New members won't be added automatically."
              }
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeModals} disabled={isUpdating}>Cancel</Button>
            <Button type="button" onClick={confirmVisibility} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChannelSettingsModal
        isOpen={modalType === "settings"}
        workspaceId={workspaceId}
        channel={channel}
        onClose={closeModals}
      />

      {/* Leave Channel Dialog */}
      <Dialog open={modalType === "leave"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Leave Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave #{channel.name}? You will need to be re-invited to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              You will no longer receive messages or notifications from this channel.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeModals} disabled={isLeaving}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmLeave} disabled={isLeaving}>
              {isLeaving ? "Leaving..." : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
