
export type DMPair = string; 


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


export interface CreateConversationDTO {
  targetUserId: string;
}

export interface MarkReadDTO {
  messageId: string;
}


export interface UnreadCountResult {
  conversationId: string;
  unreadCount: number;
}

export interface ConversationListResult {
  conversations: ConversationDTO[];
  unreadCounts: UnreadCountResult[];
}


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
