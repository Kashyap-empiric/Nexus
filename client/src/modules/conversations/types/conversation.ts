import type { Message } from "@/modules/messages/types/message";

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationMember {
  id: string;
  userId: string;
  lastReadMessageId: string | null;
  user: User;
}

export interface Conversation {
  id: string;
  type: "DM" | "CHANNEL";
  isPrivate: boolean;
  visibility?: "PUBLIC" | "PRIVATE";
  name: string | null;
  dmPair: string | null;
  workspaceId?: string | null;
  members: ConversationMember[];
  latestMessageId?: string | null;
  latestMessage?: {
    id: string;
    userId: string;
    content: string;
    deletedAt: string | null;
    createdAt: string;
    user: {
      username: string;
    };
  } | null;
  updatedAt: string;
  unreadCount?: number;
}
