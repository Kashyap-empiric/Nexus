"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ActiveConversation } from "@/modules/chat";

export default function ActiveConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams?.get("highlight") || undefined;
  
  return <ActiveConversation conversationId={conversationId} highlightMessageId={highlightMessageId} />;
}
