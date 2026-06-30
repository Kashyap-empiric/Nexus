import { api } from "@/shared/lib/api";
import { supabase } from "@/shared/lib/supabase";
import { ENV } from "@/config/env";
import { API_ROUTES } from "@/config/url";
import type { Conversation } from "../types/conversation";

export const getConversations = async () => {
  const response = await api.get<{ data: Conversation[] }>(API_ROUTES.CONVERSATIONS.BASE);
  return response.data.data;
};

export const getConversationDetails = async (id: string) => {
  const response = await api.get<{ data: Conversation }>(API_ROUTES.CONVERSATIONS.DETAIL(id));
  return response.data.data;
};

export const createConversation = async (targetUserId: string) => {
  const response = await api.post<{ data: Conversation }>(API_ROUTES.CONVERSATIONS.BASE, { targetUserId });
  return response.data.data;
};

export const markConversationRead = async (conversationId: string, messageId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const response = await fetch(`${ENV.API_URL}${API_ROUTES.CONVERSATIONS.READ(conversationId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ messageId }),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error("Failed to mark conversation read");
  }
  return response.json();
};
