"use client";

import { useState, useMemo } from "react";
import { useChannelMembersQuery, useAddChannelMembersMutation, useRemoveChannelMemberMutation } from "../hooks/useChannelMembers";
import { useWorkspaceMembersQuery } from "../hooks/useWorkspaces";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { X, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";

interface ManageChannelMembersModalProps {
  workspaceId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageChannelMembersModal({ workspaceId, channelId, open, onOpenChange }: ManageChannelMembersModalProps) {
  const { data: channelMembers, isLoading: membersLoading } = useChannelMembersQuery(workspaceId, channelId);
  const { data: workspaceMembers } = useWorkspaceMembersQuery(workspaceId);
  const { mutate: addMembers, isPending: isAdding } = useAddChannelMembersMutation();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveChannelMemberMutation();
  const currentUser = useUser();

  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const channelMemberIds = useMemo(() => new Set(channelMembers?.map(m => m.userId) || []), [channelMembers]);

  const availableMembers = useMemo(() => {
    if (!workspaceMembers) return [];
    return workspaceMembers.filter(m => !channelMemberIds.has(m.userId) && m.userId !== currentUser?.id);
  }, [workspaceMembers, channelMemberIds, currentUser]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableMembers;
    const q = searchQuery.toLowerCase();
    return availableMembers.filter(m => m.user?.username?.toLowerCase().includes(q));
  }, [availableMembers, searchQuery]);

  const handleAddMembers = () => {
    const userIds = filteredAvailable.map(m => m.userId);
    if (userIds.length === 0) {
      toast.error("No users to add");
      return;
    }
    addMembers({ workspaceId, channelId, userIds }, {
      onSuccess: () => {
        toast.success(`${userIds.length} member(s) added to channel`);
        setShowAdd(false);
        setSearchQuery("");
      },
      onError: (err: any) => {
        const errorMsg = err?.response?.data?.error || err?.message || "Failed to add members";
        toast.error(errorMsg);
      },
    });
  };

  const handleRemoveMember = (userId: string, username: string) => {
    removeMember({ workspaceId, channelId, userId }, {
      onSuccess: () => {
        toast.success(`${username} removed from channel`);
      },
      onError: (err: any) => {
        const errorMsg = err?.response?.data?.error || err?.message || "Failed to remove member";
        toast.error(errorMsg);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" style={{ maxWidth: '1200px' }}>
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
          <DialogDescription>
            Add or remove members from this channel.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Current members ({channelMembers?.length || 0})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAdd(!showAdd);
                    setSearchQuery("");
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {showAdd ? "Cancel" : "Add members"}
                </Button>
              </div>

              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : channelMembers?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No members in this channel yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {channelMembers?.map(member => (
                    <div key={member.userId} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={member.user?.username || "User"}
                          src={member.user?.avatarUrl}
                          className="h-7 w-7"
                          fallbackClassName="text-[9px]"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {member.user?.username || "User"}
                          </span>
                          {member.user?.fullName && (
                            <span className="text-xs text-muted-foreground truncate">
                              {member.user.fullName}
                            </span>
                          )}
                        </div>
                      </div>
                      {member.userId !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.user?.username || "User")}
                          disabled={isRemoving}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-opacity"
                          title="Remove from channel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showAdd && (
              <div className="border-t pt-4">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workspace members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    autoFocus
                  />
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery ? "No matching members found" : "All workspace members are already in this channel"}
                    </p>
                  ) : (
                    filteredAvailable.map(member => (
                      <div key={member.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50">
                        <UserAvatar
                          name={member.user?.username || "User"}
                          src={member.user?.avatarUrl}
                          className="h-7 w-7"
                          fallbackClassName="text-[9px]"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {member.user?.username || "User"}
                          </span>
                          {member.user?.fullName && (
                            <span className="text-xs text-muted-foreground truncate">
                              {member.user.fullName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        {showAdd && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAdd(false); setSearchQuery(""); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={filteredAvailable.length === 0 || isAdding}
            >
              {isAdding ? "Adding..." : `Add all (${filteredAvailable.length})`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
