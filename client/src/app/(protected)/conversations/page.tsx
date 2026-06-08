"use client";

import { useConversationsQuery, EmptyState } from "@/modules/chat";

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

