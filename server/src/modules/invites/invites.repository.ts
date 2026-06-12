import { prisma } from "@/lib/db.js";
import type { Prisma } from "@prisma/client";
import { InviteType } from "@prisma/client";

// ====== Reads ======

export const findInviteByTokenInTransaction = async (
  tx: Prisma.TransactionClient,
  token: string
) => {
  return tx.invite.findUnique({ where: { token } });
};

export const findExistingActiveInvite = async (
  type: InviteType,
  entityId: string,
  userId: string
) => {
  return prisma.invite.findFirst({
    where: {
      type,
      entityId,
      createdBy: userId,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findConversationById = async (
  id: string,
  userId: string
) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: { members: { where: { userId } } },
  });
};

// ====== Writes ======

export const createInvite = async (data: {
  type: InviteType;
  entityId: string;
  token: string;
  createdBy: string;
  expiresAt: Date;
}) => {
  return prisma.invite.create({ data });
};

export const revokeInvite = async (inviteId: string) => {
  return prisma.invite.update({
    where: { id: inviteId },
    data: { revoked: true },
  });
};

export const revokeAllInvitesForEntity = async (
  type: InviteType,
  entityId: string
) => {
  return prisma.invite.updateMany({
    where: { type, entityId },
    data: { revoked: true },
  });
};

export const revokeAllInvitesCreatedByUser = async (userId: string) => {
  return prisma.invite.updateMany({
    where: { createdBy: userId },
    data: { revoked: true },
  });
};

// ====== Transaction Helpers ======

export const consumeInviteAtomicInTransaction = async (
  tx: Prisma.TransactionClient,
  inviteId: string
) => {
  return tx.$executeRaw`
    UPDATE "Invite"
    SET "usedCount" = "usedCount" + 1, "lastUsedAt" = NOW()
    WHERE "id" = ${inviteId}
      AND "revoked" = false
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;
};

export const deleteInvitesForEntityInTransaction = async (
  tx: Prisma.TransactionClient,
  type: InviteType,
  entityId: string
) => {
  return tx.invite.deleteMany({
    where: { type, entityId },
  });
};
