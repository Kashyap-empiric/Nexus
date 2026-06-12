import type { UserDTO, LatestMessageDTO } from "../conversations/conversations.types";

// ──── DTOs ────

export interface MessageDTO {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  isEdited: boolean;
  deletedAt: string | null;
  createdAt: Date;
  user: UserDTO;
}

export interface MessagePage {
  messages: MessageDTO[];
  nextCursor: string | null;
}

export interface ConversationMetadataDTO {
  id: string;
  name: string | null;
  updatedAt: Date;
  latestMessageId: string | null;
  latestMessage?: LatestMessageDTO | null;
}

export interface CreateMessageResult {
  message: MessageDTO;
  conversationMetadata: ConversationMetadataDTO;
}

export interface EditMessageResult {
  message: MessageDTO;
  conversationMetadata: ConversationMetadataDTO | null;
}

export interface DeleteMessageResult {
  message: MessageDTO;
  conversationMetadata: ConversationMetadataDTO | null;
}

// ──── Service Input Types ────

export interface CreateMessageInput {
  conversationId: string;
  userId: string;
  content: string;
}

export interface EditMessageInput {
  messageId: string;
  userId: string;
  content: string;
}

export interface DeleteMessageInput {
  messageId: string;
  userId: string;
}
