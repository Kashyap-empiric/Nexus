"use client";

import { useState } from "react";
import { MessageSquarePlus, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { EmptyStateSkeleton } from "./EmptyStateSkeleton";

const NewConversationModal = dynamic(() => import("./NewConversationModal").then((m) => m.NewConversationModal), { ssr: false });
import { useConversationsQuery } from "../hooks/useConversations";
import { Button } from "@/shared/components/ui/button";
import { useInviteModal } from "@/modules/invites/hooks/useInviteModal";
const InviteModal = dynamic(() => import("@/modules/invites/components/InviteModal").then((m) => m.InviteModal), { ssr: false });

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
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-12 w-12 text-primary" />
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
            <h2 className="text-3xl font-bold tracking-tight">No conversations yet.</h2>
            <p className="text-muted-foreground text-lg">
              Search for someone to start chatting.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Start a Conversation
              </button>
              <Button onClick={() => inviteModal.open("USER")} size="lg" className="w-full sm:w-auto min-w-[200px] h-12 shadow-lg hover:shadow-xl transition-all">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Someone
              </Button>
            </div>
          </>
        )}
      </div>

      <NewConversationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
      <InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
    </div>
  );
}
