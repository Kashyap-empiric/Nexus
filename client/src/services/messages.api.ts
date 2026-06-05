import { api } from "./api";
import { API_ROUTES } from "@/constants/paths";
import type { Message } from "@/hooks/useMessages";

export interface MessagesResponse {
  data: Message[];
  nextCursor: string | null;
}

export const getMessages = async (conversationId: string, cursor?: string | null) => {
  const url = API_ROUTES.CONVERSATIONS.MESSAGES(conversationId, cursor);
  const response = await api.get<MessagesResponse>(url);
  return response.data;
};

export const createMessage = async (conversationId: string, content: string) => {
  const response = await api.post<{ data: Message }>(API_ROUTES.CONVERSATIONS.MESSAGES(conversationId), { content });
  return response.data.data;
};
