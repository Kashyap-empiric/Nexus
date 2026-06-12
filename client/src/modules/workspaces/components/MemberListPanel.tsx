"use client";

import { useWorkspaceMembersQuery, useUpdateMemberRole } from "../hooks/useWorkspaces";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useSocketStore } from "@/socket/socketStore";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreVertical, Shield, ShieldAlert, UserIcon } from "lucide-react";
import type { WorkspaceRole } from "../types/workspace";

interface MemberListPanelProps {
  workspaceId: string;
}

export function MemberListPanel({ workspaceId }: MemberListPanelProps) {
  const { data: members, isLoading } = useWorkspaceMembersQuery(workspaceId);
  const { mutate: updateRole } = useUpdateMemberRole();
  const currentUser = useUser();

  const onlineUsers = useSocketStore(state => state.onlineUsers);

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

  const currentUserMember = members.find(m => m.userId === currentUser?.id);
  const isOwner = currentUserMember?.role === "OWNER";

  const handleRoleChange = (userId: string, role: string) => {
    updateRole({ workspaceId, userId, role });
  };

  const onlineMembers = members.filter(m => onlineUsers.has(m.userId));
  const offlineMembers = members.filter(m => !onlineUsers.has(m.userId));

  const renderMember = (member: typeof members[0]) => {
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
            <PresenceIndicator userId={member.userId} className="-bottom-0.5 -right-0.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate flex items-center gap-1.5">
              {member.user?.username || "User"}
              {member.role === "OWNER" && <ShieldAlert className="h-3 w-3 text-yellow-600" />}
              {member.role === "ADMIN" && <Shield className="h-3 w-3 text-blue-500" />}
            </span>
          </div>
        </div>

        {isOwner && !isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground transition-opacity focus-visible:outline-none">
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border shadow-md">
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 border-l bg-muted/10 p-4 overflow-y-auto shrink-0 flex flex-col gap-6 h-full">
      {onlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Online — {onlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {onlineMembers.map(renderMember)}
          </div>
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Offline — {offlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {offlineMembers.map(renderMember)}
          </div>
        </div>
      )}
    </div>
  );
}
