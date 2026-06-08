"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus } from "lucide-react";
import { NewConversationModal } from "./NewConversationModal";
import { useConversationsQuery } from "../hooks/useConversations";
import { useRouter } from "next/navigation";

export function EmptyState() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { data: conversations, isLoading } = useConversationsQuery();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && conversations && conversations.length > 0) {
      const mostRecent = [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      if (mostRecent) {
        router.replace(`/conversations/${mostRecent.id}`);
      }
    }
  }, [conversations, isLoading, router]);

  if (isLoading || (conversations && conversations.length > 0)) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-12 w-12 text-primary" />
        </div>

        <h2 className="text-3xl font-bold tracking-tight">No conversations yet.</h2>
        <p className="text-muted-foreground text-lg">
          Search for someone to start chatting.
        </p>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Start a Conversation
        </button>
      </div>

      <NewConversationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    </div>
  );
}
