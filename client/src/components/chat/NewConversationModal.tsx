import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Loader2 } from "lucide-react";
import { useCreateConversationMutation } from "@/hooks/useConversations";
import { useUsersSearchQuery } from "@/hooks/useUsers";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  if (!isOpen) return null;

  const handleSelectUser = (userId: string) => {
    createConversation(userId, {
      onSuccess: (conversation) => {
        onClose();
        setQuery("");
        router.push(`/conversations/${conversation.id}`);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border shadow-lg rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Message</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-64 p-2">
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
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors text-left"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs leading-none">{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium leading-none">{user.username}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Type a username or email to search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
