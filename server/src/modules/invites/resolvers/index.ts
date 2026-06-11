import type { Prisma } from "@prisma/client";
import type { Invite } from "@prisma/client";
import type { DomainEvent, ResolveInviteResult } from "../invites.types.js";
import { userInviteResolver } from "./userResolver.js";
import { conversationInviteResolver } from "./conversationResolver.js";
import { workspaceInviteResolver } from "./workspaceResolver.js";
import { channelInviteResolver } from "./channelResolver.js";

export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface ResolveInviteContext {
  tx: PrismaTransaction;
  invite: Invite;
  actorId: string;
}

export interface InviteResolver {
  resolve(context: ResolveInviteContext): Promise<ResolveInviteResult>;
}

export const resolvers: Record<string, InviteResolver> = {
  USER: userInviteResolver,
  CONVERSATION: conversationInviteResolver,
  WORKSPACE: workspaceInviteResolver,
  CHANNEL: channelInviteResolver,
};
