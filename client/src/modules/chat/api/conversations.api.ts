import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/shared/constants/api_routes";
import type { Conversation } from "../hooks/useConversations";

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
  const response = await api.patch<{ success: boolean }>(API_ROUTES.CONVERSATIONS.READ(conversationId), { messageId });
  return response.data;
};
