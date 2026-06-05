"use client";

import { useParams } from "next/navigation";
import { ActiveConversation } from "@/components/chat/ActiveConversation";

export default function ActiveConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  
  return <ActiveConversation conversationId={conversationId} />;
}
