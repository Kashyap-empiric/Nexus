"use client";

import { MessageSquarePlus } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";

export default function ConversationsPage() {
  const { data: conversations, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50 h-full">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary/20" />
      </div>
    );
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
        
        <button className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Start a Conversation
        </button>
      </div>
    </div>
  );
}

