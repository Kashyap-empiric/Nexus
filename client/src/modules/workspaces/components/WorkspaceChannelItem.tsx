"use client";

import { useState, useRef } from "react";
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

  const triggerRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;

    longPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      longPressRef.current = true;
      setTimeout(() => triggerRef.current?.click(), 0);
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || !startPosRef.current || !pressTimerRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleItemClick = () => {
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    onNavigate?.();
    router.push(`/workspaces/${workspaceId}/channels/${channel.id}`);
  };

  const closeModals = () => {
    setModalType(null);
    setRenameValue(channel.name || "");
  };

  const handleRenameClick = () => {
    setRenameValue(channel.name || "");
    setModalType("rename");
  };

  const handleDeleteClick = () => setModalType("delete");
  const handleVisibilityClick = () => setModalType("visibility");
  const handleManageMembersClick = () => setModalType("members");
  const handleSettingsClick = () => setModalType("settings");
  const handleLeaveClick = () => setModalType("leave");

  const confirmDelete = () => {
    deleteChannel({ workspaceId, channelId: channel.id }, {
      onSuccess: () => {
        closeModals();
        if (isActive) {
          const generalChannel = channels?.find(c => c.name === "general");
          router.push(generalChannel
            ? `/workspaces/${workspaceId}/channels/${generalChannel.id}`
            : `/workspaces/${workspaceId}`
          );
        }
      }
    });
  };

  const confirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renameValue && renameValue.trim() !== channel.name) {
      const channelName = renameValue.trim().toLowerCase().replace(/\s+/g, "-");
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
            router.push(generalChannel
              ? `/workspaces/${workspaceId}/channels/${generalChannel.id}`
              : `/workspaces/${workspaceId}`
            );
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
      { }
      <div
        role="button"
        tabIndex={0}
        onClick={handleItemClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          triggerRef.current?.click();
        }}
        className={`group flex items-center justify-between px-2 py-2 rounded-md transition-colors cursor-pointer ${isActive
            ? "bg-brand/10 text-brand"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
      >
        { }
        <div className="flex items-center gap-2 min-w-0">
          {channel.visibility === "PRIVATE" ? (
            <Lock className="h-4 w-4 shrink-0 opacity-70" />
          ) : (
            <Hash className="h-4 w-4 shrink-0 opacity-70" />
          )}
          <span className={`truncate text-sm leading-snug ${isActive ? "font-medium" : isUnread ? "font-bold text-foreground" : "font-medium"}`}>
            {channel.name}
          </span>
        </div>

        { }
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isUnread && !isActive && (
            <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-[12px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  ref={triggerRef}
                  className={`p-1 rounded transition-opacity focus-visible:outline-none hover:bg-muted ${isActive ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                    }`}
                />
              }
            >
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
      </div>

      { }
      <Dialog open={modalType === "rename"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Rename Channel</DialogTitle>
            <DialogDescription>Give this channel a new name for everyone.</DialogDescription>
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

      { }
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
              All messages in this channel will be permanently deleted.
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

      { }
      <ManageChannelMembersModal
        workspaceId={workspaceId}
        channelId={channel.id}
        open={modalType === "members"}
        onOpenChange={handleCloseModal}
      />

      { }
      <Dialog open={modalType === "visibility"} onOpenChange={handleCloseModal}>
        <DialogContent size="sm" elevation="md" fullscreenMobile>
          <DialogHeader>
            <DialogTitle>Change Visibility</DialogTitle>
            <DialogDescription>
              Are you sure you want to make #{channel.name}{" "}
              {channel.visibility === "PRIVATE" ? "public" : "private"}?
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {channel.visibility === "PRIVATE"
                ? "Anyone in the workspace will be able to see and join this channel."
                : "Only current members will be able to see this channel."}
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

      { }
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
