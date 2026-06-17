"use client";

import { useState } from "react";
import { useWorkspaceMembersQuery, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaces";
import { useChannelMembersQuery } from "../hooks/useChannelMembers";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useSocketStore } from "@/socket/socketStore";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { MoreVertical, Shield, ShieldAlert, UserIcon, UserX, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember, WorkspaceRole } from "../types/workspace";
import type { ConversationMember } from "@/modules/conversations/types/conversation";

interface MemberListPanelProps {
  workspaceId: string;
  channelId?: string;
}

export function MemberListPanel({ workspaceId, channelId }: MemberListPanelProps) {
  const { data: wsMembers, isLoading: wsLoading } = useWorkspaceMembersQuery(workspaceId);
  const { data: chMembers, isLoading: chLoading } = useChannelMembersQuery(workspaceId, channelId || null);
  const { mutate: updateRole } = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();
  const currentUser = useUser();

  const onlineUsers = useSocketStore(state => state.onlineUsers);

  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isChannelView = !!channelId;
  const members = isChannelView ? chMembers : wsMembers;
  const isLoading = isChannelView ? chLoading : wsLoading;

  if (isLoading || !members) {
    return (
      <div className="w-72 border-l bg-muted/10 p-4 shrink-0 flex flex-col gap-4 h-full">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  const currentUserMember = !isChannelView ? (members as WorkspaceMember[]).find(m => m.userId === currentUser?.id) : null;
  const isOwner = (currentUserMember as any)?.role === "OWNER";
  const isAdmin = (currentUserMember as any)?.role === "ADMIN";

  const handleRoleChange = (userId: string, role: string) => {
    updateRole({ workspaceId, userId, role });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await removeMemberMutation.mutateAsync({
        workspaceId,
        userId: memberToRemove.userId,
      });
      toast.success(`${memberToRemove.user?.username || "User"} removed from workspace`);
      setMemberToRemove(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to remove member";
      toast.error(errorMsg);
    } finally {
      setIsRemoving(false);
    }
  };

  const canManage = (targetMember: WorkspaceMember) => {
    if (isOwner) {
      return targetMember.role !== "OWNER";
    }
    if (isAdmin) {
      return targetMember.role === "MEMBER";
    }
    return false;
  };

  const onlineMembers = members.filter(m => onlineUsers.has(m.userId));
  const offlineMembers = members.filter(m => !onlineUsers.has(m.userId));

  const menuItems = (member: WorkspaceMember, isSelf: boolean) => {
    if (isChannelView) return null;
    if (isSelf || !canManage(member)) return null;

    return (
      <DropdownMenu key="menu">
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground transition-opacity focus-visible:outline-none">
          <MoreVertical className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border shadow-md">
          {isOwner && (
            <>
              <DropdownMenuItem 
                onClick={() => handleRoleChange(member.userId, "MEMBER")}
                disabled={member.role === "MEMBER"}
                className="cursor-pointer"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Make Member
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleRoleChange(member.userId, "ADMIN")}
                disabled={member.role === "ADMIN"}
                className="cursor-pointer"
              >
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setMemberToRemove(member)}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
          >
            <UserX className="h-4 w-4 mr-2" />
            Remove from workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMember = (member: any) => {
    const isSelf = member.userId === currentUser?.id;

    return (
      <div key={member.userId} className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-default">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar
              name={member.user?.username || "User"}
              src={member.user?.avatarUrl}
              className="h-8 w-8"
              fallbackClassName="text-[10px]"
            />
            <PresenceIndicator 
              userId={member.userId} 
              status={member.user?.status as any}
              className="-bottom-0.5 -right-0.5" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate flex items-center gap-1.5">
              {member.user?.username || "User"}
              {!isChannelView && member.role === "OWNER" && <ShieldAlert className="h-3 w-3 text-yellow-600" />}
              {!isChannelView && member.role === "ADMIN" && <Shield className="h-3 w-3 text-blue-500" />}
            </span>
          </div>
        </div>

        {menuItems(member, isSelf)}
      </div>
    );
  };

  return (
    <div className="w-72 border-l bg-muted/10 p-4 overflow-y-auto shrink-0 flex flex-col gap-6 h-full">
      {onlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {isChannelView ? "In Channel" : "Online"} — {onlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {onlineMembers.map(renderMember)}
          </div>
        </div>
      )}
      {offlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {isChannelView ? "In Channel" : "Offline"} — {offlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {offlineMembers.map(renderMember)}
          </div>
        </div>
      )}

      {/* Remove member confirmation dialog (workspace view only) */}
      {!isChannelView && (
        <Dialog open={!!memberToRemove} onOpenChange={(open) => { if (!open && !isRemoving) setMemberToRemove(null); }}>
          <DialogContent className="sm:max-w-sm" showCloseButton={!isRemoving}>
            <DialogHeader>
              <DialogTitle>Remove member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <strong>{memberToRemove?.user?.username || "this user"}</strong> from the workspace?
                They will lose access to all channels and conversations in this workspace.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton={!isRemoving}>
              <Button 
                variant="destructive" 
                onClick={handleRemoveMember}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
