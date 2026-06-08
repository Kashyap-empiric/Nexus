import type { User } from "./conversation";

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  user: User;
  optimistic?: boolean;
  pending?: boolean;
}

export interface MessagePage {
  data: Message[];
  nextCursor: string | null;
}
