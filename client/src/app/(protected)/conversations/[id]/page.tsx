"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ActiveConversation } from "@/modules/chat";
import { useChatStore } from "@/modules/chat/store/chatStore";

export default function ActiveConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams?.get("highlight") || undefined;

  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  // Reset mode to DM when viewing a DM conversation (fixes phantom workspace redirect)
  useEffect(() => {
    setMode("DM");
    setActiveWorkspaceId(null);
    setActiveConversationId(conversationId);
  }, [setMode, setActiveWorkspaceId, setActiveConversationId, conversationId]);
  
  return <ActiveConversation conversationId={conversationId} highlightMessageId={highlightMessageId} />;
}
