"use client";

import { useState } from "react";
import { MessageSquarePlus, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { EmptyStateSkeleton } from "./EmptyStateSkeleton";

const NewConversationModal = dynamic(() => import("./NewConversationModal").then((m) => m.NewConversationModal), { ssr: false });
import { useConversationsQuery } from "../hooks/useConversations";
import { Button } from "@/shared/components/ui/button";
import { useInviteModal } from "@/modules/invites/hooks/useInviteModal";

export function EmptyState() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const inviteModal = useInviteModal();
  const { data: conversations, isLoading } = useConversationsQuery();

  if (isLoading) {
    return <EmptyStateSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-12 w-12 text-brand" />
        </div>

        {conversations && conversations.length > 0 ? (
          <>
            <h2 className="text-3xl font-bold tracking-tight">Your Messages</h2>
            <p className="text-muted-foreground text-lg">
              Select a conversation from the sidebar to start chatting.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold tracking-tight">Welcome to Nexus</h2>
            <p className="text-muted-foreground text-lg max-w-sm">
              Start a conversation with a teammate or invite someone new to get going.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full justify-center">
              <Button
                onClick={() => setIsNewModalOpen(true)}
                className="w-full sm:w-auto h-11 shadow-sm"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Start a Conversation
              </Button>
              <Button onClick={() => inviteModal.open("USER")} variant="outline" className="w-full sm:w-auto h-11 shadow-sm transition-all">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Someone
              </Button>
            </div>
          </>
        )}
      </div>

      <NewConversationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    </div>
  );
}
