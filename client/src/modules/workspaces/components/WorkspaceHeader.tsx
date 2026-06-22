"use client";

import React, { useState } from "react";
import type { Workspace } from "../types/workspace";
import { ChevronDown, UserPlus, Settings, LogOut } from "lucide-react";
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
import { useLeaveWorkspaceMutation } from "../hooks/useWorkspaces";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/modules/chat/store/chatStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  onInviteClick?: () => void;
  onSettingsClick?: () => void;
  rightElement?: React.ReactNode;
  canManage?: boolean;
}

export function WorkspaceHeader({ workspace, onInviteClick, onSettingsClick, rightElement, canManage = false }: WorkspaceHeaderProps) {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const { mutateAsync: leaveWorkspace, isPending: isLeaving } = useLeaveWorkspaceMutation();
  const router = useRouter();

  const handleLeave = async () => {
    if (!workspace.id) return;
    try {
      await leaveWorkspace({ workspaceId: workspace.id });
      toast.success("Left workspace successfully");
      setIsLeaveModalOpen(false);
      useChatStore.getState().setActiveWorkspaceId(null);
      useChatStore.getState().setMode("DM");
      router.push("/conversations");
    } catch (err: unknown) {
      toast.error(friendlyError(err, "Failed to leave workspace"));
    }
  };

  return (
    <>
      <div className="flex items-center h-14 border-b bg-sidebar z-10 sticky top-0 shrink-0 w-full">
      <div className="flex-1 h-full min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="group flex w-full h-full items-center justify-between px-4 font-semibold text-lg hover:bg-accent/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-0 touch-manipulation select-none"
          >
            <span className="truncate">{workspace.name}</span>
            <div className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 ml-2">
              <ChevronDown className="h-4 w-4 shrink-0 text-foreground opacity-60 transition-transform duration-200 group-data-[open]:rotate-180" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {canManage && (
              <>
                <DropdownMenuItem
                  onClick={() => onSettingsClick?.()}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Workspace Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onInviteClick?.()}
                  className="gap-2 cursor-pointer text-brand focus:text-brand"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite People
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={() => setIsLeaveModalOpen(true)}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Leave Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rightElement && (
        <div className="shrink-0 flex items-center pr-2">
          {rightElement}
        </div>
      )}
    </div>

      <AlertDialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave <strong>{workspace.name}</strong>?
              You will lose access to all channels and messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleLeave();
              }}
              disabled={isLeaving}
            >
              {isLeaving ? "Leaving..." : "Leave Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
