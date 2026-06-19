"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { useCreateConversationMutation } from "@/modules/conversations/hooks/useConversations";
import { useUsersSearchQuery } from "@/modules/users";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversationMutation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: users, isLoading: isSearching } = useUsersSearchQuery(debouncedQuery, isOpen);

  const handleSelectUser = (userId: string) => {
    createConversation(userId, {
      onSuccess: (conversation) => {
        setQuery("");
        setDebouncedQuery("");
        onClose();
        router.push(`/conversations/${conversation.id}`);
      },
      onError: (error) => {
        console.error("Failed to create conversation:", error);
        // @ts-expect-error : error property is not officially typed but provided by the API
        toast.error(`Failed to create conversation: ${error?.response?.data?.error || error.message}`);
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="md" elevation="md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {}
          <div className="overflow-y-auto max-h-64 -mx-6 px-6">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : query.trim() && users?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found.
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-1">
                {!query.trim() && (
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Suggested Users
                  </div>
                )}
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="w-full flex items-center justify-between py-2 px-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        name={user.username}
                        src={user.avatarUrl}
                        className="h-8 w-8 shrink-0"
                        fallbackClassName="text-xs"
                      />
                      <div className="flex flex-col items-start justify-center min-w-0">
                        {user.fullName ? (
                          <>
                            <span className="font-medium text-sm leading-none truncate">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground mt-1">@{user.username}</span>
                          </>
                        ) : (
                          <span className="font-medium text-sm leading-none">@{user.username}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isCreating}
                      onClick={() => handleSelectUser(user.id)}
                      className="h-7 text-xs px-3 rounded-full shrink-0"
                    >
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Type a username or email to search.
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
