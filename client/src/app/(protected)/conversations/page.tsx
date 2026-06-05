"use client";

import { useConversationsQuery } from "@/hooks/useConversations";
import { EmptyState } from "@/components/chat/EmptyState";

export default function ConversationsPage() {
  const { isLoading } = useConversationsQuery();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50 h-full">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary/20" />
      </div>
    );
  }

  return <EmptyState />;
}

