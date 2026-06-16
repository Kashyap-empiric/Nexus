import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import type { Message } from "../types/message";

export interface MessagesResponse {
  data: Message[];
  nextCursor: string | null;
}

export interface MessageSearchResult {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    avatarPath: string | null;
  };
  conversation: {
    id: string;
    name: string | null;
    type: "DM" | "CHANNEL";
    workspaceId: string | null;
  };
}

export const searchMessages = async (query: string) => {
  const response = await api.get<{ data: MessageSearchResult[] }>(API_ROUTES.MESSAGES.SEARCH(query));
  return response.data.data;
};

export const getMessages = async (conversationId: string, cursor?: string | null) => {
  const url = API_ROUTES.CONVERSATIONS.MESSAGES(conversationId, cursor);
  const response = await api.get<MessagesResponse>(url);
  return response.data;
};

export const createMessage = async (conversationId: string, content: string, replyToId?: string | null) => {
  const response = await api.post<{ data: Message }>(API_ROUTES.CONVERSATIONS.MESSAGES(conversationId), { content, replyToId });
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
