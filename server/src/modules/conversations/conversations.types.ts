// ──── Value Types ────

export type DMPair = string; // `${sorted(userA)}:${sorted(userB)}`

// ──── DTOs (what services return) ────

export interface UserDTO {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationMemberDTO {
  id: string;
  userId: string;
  lastReadMessageId: string | null;
  user: UserDTO;
}

export interface LatestMessageDTO {
  id: string;
  userId: string;
  content: string;
  deletedAt: string | null;
  createdAt: string;
  user: {
    username: string;
  };
}

export interface ConversationDTO {
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
  latestMessage: LatestMessageDTO | null;
  unreadCount?: number;
}

// ──── Service Input DTOs ────

export interface CreateConversationDTO {
  targetUserId: string;
}

export interface MarkReadDTO {
  messageId: string;
}

// ──── Repository Return Types ────

export interface UnreadCountResult {
  conversationId: string;
  unreadCount: number;
}

export interface ConversationListResult {
  conversations: ConversationDTO[];
  unreadCounts: UnreadCountResult[];
}

// ──── Repository Input Types ────

export interface CreateDMData {
  id: string;
  type: "DM";
  workspaceId: null;
  isPrivate: true;
  dmPair: string;
  members: {
    create: Array<{ id: string; userId: string }>;
  };
}

export interface DMResult {
  created: boolean;
  conversation: ConversationDTO & { members: Array<{ user: UserDTO & { email?: string } }> };
}

// ──── Channel Types ────

export interface ChannelDTO {
  id: string;
  name: string | null;
  workspaceId: string;
  type: "CHANNEL";
  members: ConversationMemberDTO[];
  latestMessage: LatestMessageDTO | null;
  updatedAt: Date;
  unreadCount?: number;
}
