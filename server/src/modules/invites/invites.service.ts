import { prisma } from "../../lib/db.js";
import { Prisma } from "@prisma/client";
import { type ResolveInviteParams, type ResolveInviteResult, type GenerateInviteParams, type GenerateInviteResult, type DomainEvent } from "./invites.types.js";
import { InviteType } from "@prisma/client";
import crypto from "crypto";
import { ENV } from "../../config/env.js";
import { resolvers } from "./resolvers/index.js";

export const resolveInviteService = async ({ token, userId }: ResolveInviteParams): Promise<ResolveInviteResult> => {
  let redirectUrl = "";
  let domainEvents: DomainEvent[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch Invite
      const invite = await tx.invite.findUnique({
        where: { token }
      });

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
        const updateResult = await tx.$executeRaw`
          UPDATE "Invite"
          SET "usedCount" = "usedCount" + 1, "lastUsedAt" = NOW()
          WHERE "id" = ${invite.id}
            AND "revoked" = false
            AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
            AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
        `;

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
    const conversation = await prisma.conversation.findUnique({
      where: { id: finalEntityId },
      include: { members: { where: { userId } } }
    });
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    if (conversation.type === "DM") throw new Error("UNAUTHORIZED"); // Cannot generate group invite for a DM
    if (conversation.members.length === 0) throw new Error("UNAUTHORIZED");
  } else if (type === "USER") {
    // For USER invites, the entity is implicitly the inviter
    finalEntityId = userId;
  } else {
    // Other types can be implemented later
    if (!finalEntityId) throw new Error("ENTITY_ID_REQUIRED");
  }

  // 2. Active Invite Rotation Policy (24h window)
  const existingActive = await prisma.invite.findFirst({
    where: {
      type,
      entityId: finalEntityId as string,
      createdBy: userId,
      revoked: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingActive) {
    const ageInMs = Date.now() - existingActive.createdAt.getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);

    if (ageInHours < 24) {
      // Reuse existing invite
      return {
        invitePath: `/invite?token=${existingActive.token}`,
        token: existingActive.token,
        expiresAt: existingActive.expiresAt?.toISOString() || null,
      };
    } else {
      // Revoke older invite and proceed to create a new one
      await prisma.invite.update({
        where: { id: existingActive.id },
        data: { revoked: true }
      });
    }
  }

  // 3. Generation
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const invite = await prisma.invite.create({
    data: {
      type,
      entityId: finalEntityId as string,
      token,
      createdBy: userId,
      expiresAt,
    }
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
  return prisma.invite.update({
    where: { id: inviteId },
    data: { revoked: true }
  });
};

export const revokeAllInvitesForEntity = async (type: InviteType, entityId: string) => {
  return prisma.invite.updateMany({
    where: { type, entityId },
    data: { revoked: true }
  });
};

export const revokeAllInvitesCreatedByUser = async (userId: string) => {
  return prisma.invite.updateMany({
    where: { createdBy: userId },
    data: { revoked: true }
  });
};

export const deleteInvitesForEntity = async (tx: Prisma.TransactionClient, type: InviteType, entityId: string) => {
  return tx.invite.deleteMany({
    where: { type, entityId }
  });
};
