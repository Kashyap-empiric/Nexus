"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { NewConversationModal } from "./NewConversationModal";

export function EmptyState() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

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
