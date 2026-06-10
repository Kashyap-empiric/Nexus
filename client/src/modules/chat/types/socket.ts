import type { Message } from "./message";

export interface SocketErrorObject {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface SocketResponse<T = unknown> {
  success?: boolean;
  error?: string | SocketErrorObject;
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

export interface ConversationUpdatePayload {
  conversation: {
    id: string;
    name: string | null;
    updatedAt: string;
    latestMessageId: string | null;
    latestMessage: {
      id: string;
      userId: string;
      content: string;
      deletedAt: string | null;
      createdAt: string;
      user: {
        username: string;
      };
    } | null;
  };
}
