import { Prisma } from "@prisma/client";
import { type ResolveInviteParams, type ResolveInviteResult, type GenerateInviteParams, type GenerateInviteResult, type DomainEvent } from "./invites.types.js";
import { InviteType } from "@prisma/client";
import crypto from "crypto";
import { ENV } from "../../config/env.js";
import { resolvers } from "./resolvers/index.js";
import * as invitesRepo from "./invites.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import * as workspacesService from "../workspaces/workspaces.service.js";

import { isWorkspaceMember } from "@/shared/permissions.js";

export const resolveInviteService = async ({ token, userId }: ResolveInviteParams): Promise<ResolveInviteResult> => {
  let redirectUrl = "";
  let domainEvents: DomainEvent[] = [];

  try {
    await prismaTransaction(async (tx) => {
      // 1. Fetch Invite
      const invite = await invitesRepo.findInviteByTokenInTransaction(tx, token);

      if (!invite) throw new Error("INVALID_OR_EXPIRED_INVITE");

      // 2. Validate Invite
      if (invite.revoked) throw new Error("INVALID_OR_EXPIRED_INVITE");
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("INVALID_OR_EXPIRED_INVITE");
      if (invite.maxUses && invite.usedCount >= invite.maxUses) throw new Error("INVALID_OR_EXPIRED_INVITE");

      // 3. Resolve using domain resolver
      const resolver = resolvers[invite.type];
      if (!resolver) throw new Error("RESOLVER_NOT_FOUND");

      const result = await resolver.resolve({ tx, invite, actorId: userId });
      redirectUrl = result.redirectUrl;
      domainEvents = result.events || [];

      // 4. Consume Invite Atomically via Raw SQL (Guards against concurrency)
      if (result.consumed !== false) {
        const updateResult = await invitesRepo.consumeInviteAtomicInTransaction(tx, invite.id);

        if (updateResult === 0) {
          throw new Error("INVALID_OR_EXPIRED_INVITE");
        }
      }
    });
  } catch (error: any) {
    if (error.message === "INVALID_OR_EXPIRED_INVITE") throw error;
    if (error.message === "NOT_IMPLEMENTED") throw error;
    console.error("[resolveInviteService] error:", error);
    throw new Error("INTERNAL_SERVER_ERROR");
  }

  return { redirectUrl, events: domainEvents };
};

export const generateInviteService = async ({ type, entityId, userId }: GenerateInviteParams): Promise<GenerateInviteResult> => {
  // 1. Validation
  let finalEntityId = entityId;

  if (type === "CONVERSATION") {
    if (!finalEntityId) throw new Error("ENTITY_ID_REQUIRED");
    const conversation = await conversationsRepo.findConversationByIdForInvite(finalEntityId, userId);
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    if (conversation.type === "DM") throw new Error("UNAUTHORIZED");
    if (conversation.members.length === 0) throw new Error("UNAUTHORIZED");
  } else if (type === "WORKSPACE") {
    if (!finalEntityId) throw new Error("ENTITY_ID_REQUIRED");
    const isMember = await isWorkspaceMember(userId, finalEntityId).catch(() => false);
    if (!isMember) throw new Error("UNAUTHORIZED");
  } else if (type === "USER") {
    finalEntityId = userId;
  } else {
    if (!finalEntityId) throw new Error("ENTITY_ID_REQUIRED");
  }

  // 2. Active Invite Rotation Policy (24h window)
  const existingActive = await invitesRepo.findExistingActiveInvite(type, finalEntityId as string, userId);

  if (existingActive) {
    const ageInMs = Date.now() - existingActive.createdAt.getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);

    if (ageInHours < 24) {
      return {
        invitePath: `/invite?token=${existingActive.token}`,
        token: existingActive.token,
        expiresAt: existingActive.expiresAt?.toISOString() || null,
      };
    } else {
      await invitesRepo.revokeInvite(existingActive.id);
    }
  }

  // 3. Generation
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await invitesRepo.createInvite({
    type,
    entityId: finalEntityId as string,
    token,
    createdBy: userId,
    expiresAt,
  });

  const invitePath = `/invite?token=${token}`;

  return {
    invitePath,
    token: invite.token,
    expiresAt: invite.expiresAt?.toISOString() || null,
  };
};

// --- Revocation & Cleanup Helpers ---

export const revokeInvite = async (inviteId: string) => {
  return invitesRepo.revokeInvite(inviteId);
};

export const revokeAllInvitesForEntity = async (type: InviteType, entityId: string) => {
  return invitesRepo.revokeAllInvitesForEntity(type, entityId);
};

export const revokeAllInvitesCreatedByUser = async (userId: string) => {
  return invitesRepo.revokeAllInvitesCreatedByUser(userId);
};

export const deleteInvitesForEntity = async (tx: Prisma.TransactionClient, type: InviteType, entityId: string) => {
  return invitesRepo.deleteInvitesForEntityInTransaction(tx, type, entityId);
};

import { runTransaction as prismaTransaction } from "@/lib/transaction.js";
