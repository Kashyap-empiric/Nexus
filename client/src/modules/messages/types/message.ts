import type { User } from "@/modules/conversations/types/conversation";

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
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  pending?: boolean;
  optimistic?: boolean;
}

export interface MessagePage {
  data: Message[];
  nextCursor: string | null;
}
