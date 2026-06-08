"use client";

import { useParams } from "next/navigation";
import { ActiveConversation } from "@/modules/chat";

export default function ActiveConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  
  return <ActiveConversation conversationId={conversationId} />;
}
