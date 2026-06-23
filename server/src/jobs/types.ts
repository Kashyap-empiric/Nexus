export type PushToMembersJob = {
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  excludeUserId: string | null;
};

export type PushNotificationJob = {
  userId: string;
  payload: {
    title: string;
    body?: string;
    url?: string;
    tag?: string;
  };
  force?: boolean;
};

export type SendWorkspaceInviteData = {
  type: "workspace_invite";
  to: string;
  inviteToken: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: string | null;
};

export type SendPasswordResetData = {
  type: "password_reset";
  to: string;
  resetUrl: string;
};

export type SendEmailJob = SendWorkspaceInviteData | SendPasswordResetData;

export type RevokeInviteJob = {
  inviteToken: string;
};

export type FanOutNotificationJob = {
  type: string;
  userIds: string[];
  template: {
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
  };
};

export type BatchInviteJob = {
  workspaceId: string;
  inviterId: string;
  inviterName: string;
  workspaceName: string;
  workspaceImageUrl: string | null | undefined;
  userIds: string[];
};

export type CleanupJobData = {
  type: "expired-invites" | "expired-reset-tokens" | "soft-deleted-messages";
};

export type JobData =
  | PushToMembersJob
  | PushNotificationJob
  | SendEmailJob
  | RevokeInviteJob
  | FanOutNotificationJob
  | BatchInviteJob
  | CleanupJobData;
