import { Prisma } from "@prisma/client";
import { type ResolveInviteParams, type ResolveInviteResult, type GenerateInviteParams, type GenerateInviteResult, type DomainEvent } from "./invites.types.js";
import type { CreateNotificationInput } from "../notifications/notifications.types.js";
import { InviteType } from "@prisma/client";
import crypto from "crypto";
import { ENV } from "../../config/env.js";
import { resolvers } from "./resolvers/index.js";
import * as invitesRepo from "./invites.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import * as workspacesService from "../workspaces/workspaces.service.js";

import * as authRepo from "../auth/auth.repository.js";

export const resolveInviteService = async ({ token, userId }: ResolveInviteParams): Promise<ResolveInviteResult> => {
  let redirectUrl = "";
  let domainEvents: DomainEvent[] = [];
  let pendingNotifications: CreateNotificationInput[] = [];
  let alreadyMember = false;

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
      pendingNotifications = result.pendingNotifications || [];
      alreadyMember = result.alreadyMember || false;

      // 4. Consume Invite Atomically via Raw SQL (Guards against concurrency)
      if (result.consumed !== false) {
        const updateResult = await invitesRepo.consumeInviteAtomicInTransaction(tx, invite.id);

        if (updateResult === 0) {
          throw new Error("INVALID_OR_EXPIRED_INVITE");
        }
      }
    });

    // Dispatch pending notifications AFTER the transaction commits successfully.
    // This prevents phantom notifications on rollback (C1).
    if (pendingNotifications.length > 0) {
      // Fire-and-forget — these are non-critical notifications, don't block the response
      Promise.all(
        pendingNotifications.map(notif => createAndDispatch(notif).catch(err => {
          console.error("[resolveInviteService] Failed to dispatch pending notification:", err);
        }))
      ).catch(err => {
        console.error("[resolveInviteService] Failed to dispatch pending notifications:", err);
      });
    }
  } catch (error: any) {
    if (error.message === "INVALID_OR_EXPIRED_INVITE") throw error;
    if (error.message === "NOT_IMPLEMENTED") throw error;
    if (error.message === "ALREADY_MEMBER") throw error;
    console.error("[resolveInviteService] error:", error);
    throw error;
  }

  return { redirectUrl, events: domainEvents, alreadyMember };
};

export const generateInviteService = async ({ type, entityId, userId, forceNew }: GenerateInviteParams): Promise<GenerateInviteResult> => {
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
    const member = await authRepo.findWorkspaceMember(userId, finalEntityId).catch(() => null);
    if (!member) throw new Error("UNAUTHORIZED");
    // H2: Only workspace admins and owners can generate invite links
    if (member.role !== "ADMIN" && member.role !== "OWNER") {
      throw new Error("UNAUTHORIZED");
    }
  } else if (type === "USER") {
    finalEntityId = userId;
  } else {
    if (!finalEntityId) throw new Error("ENTITY_ID_REQUIRED");
  }

  // 2. Active Invite Rotation Policy (24h window) — skip when forceNew is true
  //    forceNew is used for targeted user invites where each invite needs a unique token
  if (!forceNew) {
    const existingActive = await invitesRepo.findExistingActiveInvite(type, finalEntityId as string, userId);

    if (existingActive) {
      // Check if the invite is exhausted (H1): if maxUses is set and usedCount >= maxUses,
      // treat it as expired rather than returning an exhausted token
      const isExhausted = existingActive.maxUses !== null && existingActive.usedCount >= existingActive.maxUses;

      if (!isExhausted) {
        const ageInMs = Date.now() - existingActive.createdAt.getTime();
        const ageInHours = ageInMs / (1000 * 60 * 60);

        if (ageInHours < 24) {
          return {
            invitePath: `/invite?token=${existingActive.token}`,
            token: existingActive.token,
            expiresAt: existingActive.expiresAt?.toISOString() || null,
          };
        }
      }

      // Revoke either way — exhausted or expired
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

export const revokeInviteByToken = async (token: string) => {
  const invite = await invitesRepo.findInviteByToken(token);
  if (!invite) return null;
  return invitesRepo.revokeInvite(invite.id);
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

import { createAndDispatch } from "../notifications/notifications.service.js";
import { runTransaction as prismaTransaction } from "@/lib/transaction.js";
import * as workspacesRepo from "../workspaces/workspaces.repository.js";
import * as usersRepo from "../users/users.repository.js";

export const getInviteInfoService = async (token: string) => {
  const invite = await invitesRepo.findInviteByToken(token);
  if (!invite) return null;

  const inviter = await usersRepo.findUserById(invite.createdBy);
  
  let entityName = "Unknown Target";
  
  if (invite.type === "WORKSPACE") {
    const workspace = await workspacesRepo.findWorkspaceById(invite.entityId);
    entityName = workspace?.name || "Unknown Workspace";
  } else if (invite.type === "CONVERSATION") {
    const conversation = await conversationsRepo.findById(invite.entityId);
    entityName = conversation?.name ? `#${conversation.name}` : "a channel";
  } else if (invite.type === "USER") {
    entityName = inviter?.username || "a user";
  }

  return {
    token: invite.token,
    inviteType: invite.type,
    entityName,
    inviterName: inviter?.username || "Someone",
    inviterAvatar: inviter?.avatarUrl || null,
    expiresAt: invite.expiresAt?.toISOString() || null,
    isRevoked: invite.revoked,
    isExpired: invite.expiresAt ? invite.expiresAt < new Date() : false,
    isValid: !invite.revoked && (invite.expiresAt ? invite.expiresAt >= new Date() : true),
  };
};

export type { GenerateInviteParams, GenerateInviteResult } from "./invites.types.js";
