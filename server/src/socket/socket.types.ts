import type { ConversationMemberDTO } from "../modules/conversations/conversations.types";

// ──── Dispatch Types ────

export interface ConversationWithMembers {
  id: string;
  type: "DM" | "CHANNEL";
  isPrivate: boolean;
  name: string | null;
  dmPair: string | null;
  workspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  latestMessageId: string | null;
  members: ConversationMemberDTO[];
}

export interface MessageReadDispatchPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
}

export type MessageAction = "NEW" | "UPDATE" | "DELETE";

export type PresenceAction = "ONLINE" | "OFFLINE" | "INITIAL";
