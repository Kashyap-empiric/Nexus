import type { Message } from "./message";

export interface SocketResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: T;
  data?: T;
}

export interface MessageSendPayload {
  conversationId: string;
  content: string;
  tempId: string;
}

export interface MessageNewPayload {
  message: Message;
}

export interface MessageReadPayload {
  conversationId: string;
  lastReadMessageId: string;
  userId: string;
}
