"use client";

import { useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ActiveConversation } from "@/modules/chat";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { socket } from "@/socket/socketClient";
import { useWorkspaces } from "@/modules/workspaces/hooks/useWorkspaces";

export default function WorkspaceChannelPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const channelId = params?.channelId as string;
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams?.get("highlight") || undefined;
  
  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  const { data: workspaces } = useWorkspaces();

  useEffect(() => {
    if (slug) {
      setMode("WORKSPACE");
      setActiveWorkspaceId(slug); 
      setActiveConversationId(channelId);
    }
  }, [slug, channelId, setMode, setActiveWorkspaceId, setActiveConversationId]);

  const joinWorkspaceRoom = useCallback(() => {
    if (!slug || !workspaces) return;
    const workspace = workspaces.find(w => w.slug === slug);
    if (workspace?.id && socket.connected) {
      socket.emit("workspace:join", { workspaceId: workspace.id }, (response: { success: boolean }) => {
        if (!response.success) {
          console.warn("[WorkspaceChannelPage] Failed to join workspace room");
        }
      });
    }
  }, [slug, workspaces]);

  useEffect(() => {
    joinWorkspaceRoom();
    socket.on("connect", joinWorkspaceRoom);
    return () => {
      socket.off("connect", joinWorkspaceRoom);
    };
  }, [joinWorkspaceRoom]);
  
  if (!channelId) return null;

  return <ActiveConversation conversationId={channelId} highlightMessageId={highlightMessageId} />;
}
