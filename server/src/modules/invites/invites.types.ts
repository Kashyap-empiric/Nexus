import { InviteType } from "@prisma/client";
import type { Invite } from "@prisma/client";
import type { CreateNotificationInput } from "../notifications/notifications.types.js";

export interface ResolveInviteParams {
  token: string;
  userId: string;
}

export interface DomainEvent {
  type: string;
  conversationId?: string;
  userId?: string;
  workspaceId?: string;
  channelId?: string;
  member?: { userId: string };
  payload?: any;
}

export interface ResolveInviteResult {
  redirectUrl: string;
  consumed?: boolean;
  alreadyMember?: boolean;
  events?: DomainEvent[];
  
  pendingNotifications?: CreateNotificationInput[];
}

export interface GenerateInviteParams {
  type: InviteType;
  entityId?: string;
  userId: string;
  
  forceNew?: boolean;
}

export interface GenerateInviteResult {
  invitePath: string;
  token: string;
  expiresAt: string | null;
}
