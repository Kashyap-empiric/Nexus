import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import type { Message } from "../types/message";

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

export const editMessage = async (conversationId: string, messageId: string, content: string) => {
  const response = await api.patch<{ data: Message }>(API_ROUTES.CONVERSATIONS.MESSAGE_DETAIL(conversationId, messageId), { content });
  return response.data.data;
};

export const deleteMessage = async (conversationId: string, messageId: string) => {
  const response = await api.delete<{ data: Message }>(API_ROUTES.CONVERSATIONS.MESSAGE_DETAIL(conversationId, messageId));
  return response.data.data;
};
