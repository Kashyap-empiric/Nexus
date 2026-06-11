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
}

export interface GenerateInviteResult {
  invitePath: string;
  token: string;
  expiresAt: string | null;
}
