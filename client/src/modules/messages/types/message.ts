import type { User } from "@/modules/conversations/types/conversation";
import type { AttachmentResponseDto } from "@/modules/uploads/api/uploads.api";

export type ClientAttachment = AttachmentResponseDto & {
  file?: File;
  localId?: string;
};

export interface ReplyTo {
  id: string;
  content: string;
  deletedAt: string | null;
  user: { username: string };
}

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  user: User;
  isEdited: boolean;
  deletedAt: string | null;
  isPinned?: boolean;
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  threadRootId?: string | null;
  threadReplyCount?: number;
  lastThreadReplyAt?: string | null;
  isThreadBroadcast?: boolean;
  pending?: boolean;
  optimistic?: boolean;
  attachments?: ClientAttachment[];
}

export interface PinnedMessage {
  id: string;
  messageId: string;
  conversationId: string;
  pinnedBy: string;
  createdAt: string;
  message: Message;
  pinnedByUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface MessagePage {
  data: Message[];
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
