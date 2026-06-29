import type { UserDTO, LatestMessageDTO } from "../conversations/conversations.types";


export interface MessageDTO {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  isEdited: boolean;
  deletedAt: string | null;
  replyToId: string | null;
  replyTo: {
    id: string;
    content: string;
    deletedAt: Date | null;
    user: { username: string };
  } | null;
  threadRootId: string | null;
  threadReplyCount: number;
  lastThreadReplyAt: string | null;
  isThreadBroadcast: boolean;
  createdAt: Date;
  user: UserDTO;
}

export interface MessagePage {
  messages: MessageDTO[];
  nextCursor: string | null;
}

export interface ThreadSummary {
  threadRootId: string;
  conversationId: string;
  rootMessagePreview: string;
  rootAuthor: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  replyCount: number;
  lastReplyAt: string;
  lastReplyPreview: string | null;
  lastReplyAuthor: { id: string; username: string; avatarUrl: string | null } | null;
  participants: { id: string; username: string; avatarUrl: string | null }[];
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


export interface CreateMessageInput {
  conversationId: string;
  userId: string;
  content: string;
  replyToId?: string | null;
  threadRootId?: string | null;
  isThreadBroadcast?: boolean;
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
