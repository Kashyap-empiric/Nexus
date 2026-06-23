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

export type SendEmailJob = {
  type: "workspace_invite" | "password_reset";
  to: string;
  data: Record<string, unknown>;
};

export type RevokeInviteJob = {
  inviteToken: string;
  reason: "email_failed";
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

export type CleanupJobData = {
  type: "expired-invites" | "expired-reset-tokens" | "soft-deleted-messages";
};

export type JobData =
  | PushNotificationJob
  | SendEmailJob
  | RevokeInviteJob
  | FanOutNotificationJob
  | CleanupJobData;
