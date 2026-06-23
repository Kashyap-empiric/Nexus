import { prisma } from "@/lib/db.js";
import type { CleanupJobData } from "../types.js";

export async function processCleanup(data: CleanupJobData): Promise<void> {
  switch (data.type) {
    case "expired-invites":
      await cleanupExpiredInvites();
      break;
    case "expired-reset-tokens":
      await cleanupExpiredResetTokens();
      break;
    case "soft-deleted-messages":
      await cleanupSoftDeletedMessages();
      break;
  }
}

async function cleanupExpiredInvites(): Promise<void> {
  const result = await prisma.invite.updateMany({
    where: {
      revoked: false,
      expiresAt: { lt: new Date() },
    },
    data: { revoked: true },
  });

  console.log(`[Cleanup] Expired invites revoked: ${result.count}`);
}

async function cleanupExpiredResetTokens(): Promise<void> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`[Cleanup] Expired reset tokens deleted: ${result.count}`);
}

async function cleanupSoftDeletedMessages(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.message.deleteMany({
    where: {
      deletedAt: { lt: thirtyDaysAgo },
    },
  });

  console.log(`[Cleanup] Soft-deleted messages purged: ${result.count}`);
}
