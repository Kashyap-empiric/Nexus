"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ActiveConversation } from "@/modules/chat";
import { useChatStore } from "@/modules/chat/store/chatStore";

export default function WorkspaceChannelPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const channelId = params?.channelId as string;
  
  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);

  useEffect(() => {
    if (slug) {
      setMode("WORKSPACE");
      setActiveWorkspaceId(slug); // Store uses slugOrId
    }
  }, [slug, setMode, setActiveWorkspaceId]);
  
  if (!channelId) return null;

  return <ActiveConversation conversationId={channelId} />;
}
