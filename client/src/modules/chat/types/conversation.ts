import type { Message } from "./message";

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
  name: string | null;
  dmPair: string | null;
  members: ConversationMember[];
  messages?: Message[];
  updatedAt: string;
}
