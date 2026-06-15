import { InviteType } from "@prisma/client";
import type { Invite } from "@prisma/client";

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
  payload?: any;
}

export interface ResolveInviteResult {
  redirectUrl: string;
  consumed?: boolean;
  events?: DomainEvent[];
}

export interface GenerateInviteParams {
  type: InviteType;
  entityId?: string;
  userId: string;
  /** When true, skip the 24-hour rotation policy and always generate a fresh token. */
  forceNew?: boolean;
}

export interface GenerateInviteResult {
  invitePath: string;
  token: string;
  expiresAt: string | null;
}
