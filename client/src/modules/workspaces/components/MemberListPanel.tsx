"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceMembersQuery, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaces";
import { useChannelMembersQuery } from "../hooks/useChannelMembers";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useSocketStore } from "@/socket/socketStore";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "@/modules/chat/components/PresenceIndicator";
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
import { MoreVertical, Shield, ShieldCheck, UserIcon, UserX } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";
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
  const [memberToPromote, setMemberToPromote] = useState<WorkspaceMember | null>(null);

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

  const currentUserMember = !isChannelView
    ? (members as WorkspaceMember[]).find(m => m.userId === currentUser?.id)
    : null;
  const isOwner = currentUserMember?.role === "OWNER";
  const isAdmin = currentUserMember?.role === "ADMIN";

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
    } catch (err: unknown) {
      const errorMsg = friendlyError(err, "Failed to remove member");
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

  const renderMember = (member: WorkspaceMember | ConversationMember) => {
    const isSelf = member.userId === currentUser?.id;
    const wsMember: WorkspaceMember | undefined = isChannelView
      ? (wsMembers as WorkspaceMember[] | undefined)?.find(w => w.userId === member.userId)
      : (member as WorkspaceMember);
    const role = (wsMember?.role || "MEMBER") as WorkspaceRole;

    const showMenu = !isChannelView && !isSelf && !!wsMember && canManage(wsMember);

    return (
      <div key={member.userId} className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-default">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <UserAvatar
              name={member.user?.username || "User"}
              src={member.user?.avatarUrl}
              className="h-8 w-8"
              fallbackClassName="text-[10px]"
            />
            <PresenceIndicator
              userId={member.userId}
              status={(member as WorkspaceMember).user?.status as string | undefined}
              className="-bottom-0.5 -right-0.5"
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">
                {member.user?.username || "User"}
              </span>
              {role === "OWNER" && (
                <span className="inline-flex items-center" title="Workspace Owner">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="sr-only">Workspace Owner</span>
                </span>
              )}
              {role === "ADMIN" && (
                <span className="inline-flex items-center" title="Workspace Admin">
                  <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="sr-only">Workspace Admin</span>
                </span>
              )}
              {isSelf && <span className="text-xs text-muted-foreground font-normal shrink-0">(you)</span>}
            </div>
          </div>
        </div>

        {showMenu && (
          <MemberActionsMenu
            member={member as WorkspaceMember}
            isOwner={isOwner}
            onPromote={setMemberToPromote}
            onRoleChange={handleRoleChange}
            onRemove={setMemberToRemove}
          />
        )}
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

      {}
      {!isChannelView && (
        <AlertDialog open={!!memberToPromote} onOpenChange={(open) => { if (!open) setMemberToPromote(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              </AlertDialogMedia>
              <AlertDialogTitle>Promote to Owner</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to make <strong>{memberToPromote?.user?.username || "this user"}</strong> an owner?
                They will have full control over the workspace, including the ability to manage members, channels, and settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!memberToPromote}
                onClick={() => {
                  if (!memberToPromote) return;
                  handleRoleChange(memberToPromote.userId, "OWNER");
                  setMemberToPromote(null);
                }}
              >
                Promote to Owner
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {}
      {!isChannelView && (
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => { if (!open && !isRemoving) setMemberToRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <UserX className="size-5 text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{memberToRemove?.user?.username || "this user"}</strong> from the workspace?
                They will lose access to all channels and conversations in this workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}



interface MemberActionsMenuProps {
  member: WorkspaceMember;
  isOwner: boolean;
  onPromote: (member: WorkspaceMember) => void;
  onRoleChange: (userId: string, role: string) => void;
  onRemove: (member: WorkspaceMember) => void;
}

function MemberActionsMenu({ member, isOwner, onPromote, onRoleChange, onRemove }: MemberActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const measure = () => {
      requestAnimationFrame(() => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 2,
            right: window.innerWidth - rect.right,
          });
        }
      });
    };

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isTrigger = triggerRef.current?.contains(target);
      const isPanel = panelRef.current?.contains(target);
      if (!isTrigger && !isPanel) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const raf = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            className="fixed z-[9999] min-w-[180px] rounded-lg bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
            style={{
              top: position.top,
              right: position.right,
            }}
          >
            {isOwner && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setIsOpen(false); onPromote(member); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="pt-[1px]">Make Owner</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setIsOpen(false); onRoleChange(member.userId, "ADMIN"); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span className="pt-[1px]">Make Admin</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setIsOpen(false); onRoleChange(member.userId, "MEMBER"); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="pt-[1px]">Make Member</span>
                </button>
                <div className="-mx-1 my-1 h-px bg-border" />
              </>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { setIsOpen(false); onRemove(member); }}
              className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <UserX className="h-4 w-4 shrink-0" />
              <span className="pt-[1px]">Remove from workspace</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
