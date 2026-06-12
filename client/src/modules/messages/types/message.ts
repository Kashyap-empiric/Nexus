import type { User } from "@/modules/conversations/types/conversation";

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  user: User;
  optimistic?: boolean;
  pending?: boolean;
  isEdited?: boolean;
  deletedAt?: string | null;
}

export interface MessagePage {
  data: Message[];
  nextCursor: string | null;
}
