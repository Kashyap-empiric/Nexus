// ──── Permission Check Results ────

export interface MembershipCheck {
  isMember: boolean;
}

export interface WorkspaceAccess {
  isMember: boolean;
  role: "ADMIN" | "MEMBER" | null;
}

export interface ConversationAccess {
  isMember: boolean;
  conversationType: "DM" | "CHANNEL" | null;
}

// ──── Service Input Types ────

export interface WorkspaceMembershipParams {
  userId: string;
  workspaceId: string;
}

export interface ConversationMembershipParams {
  userId: string;
  conversationId: string;
}
