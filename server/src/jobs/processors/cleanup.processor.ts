import { prisma } from "@/lib/db.js";
import type { CleanupJobData } from "../types.js";
import { StorageService } from "@/modules/uploads/storage.service.js";

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
    case "orphaned-uploads":
      await cleanupOrphanedUploads();
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

async function cleanupOrphanedUploads(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const batchSize = 100;
  let hasMore = true;
  let cursor: string | undefined = undefined;

  let totalScanned = 0;
  let totalDeleted = 0;
  let totalBytesRecovered = 0;
  let totalFailures = 0;

  while (hasMore) {
    const orphaned: import("@prisma/client").Attachment[] = await prisma.attachment.findMany({
      where: {
        messageId: null,
        createdAt: { lt: twentyFourHoursAgo },
      },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
    });

    if (orphaned.length === 0) {
      hasMore = false;
      break;
    }

    totalScanned += orphaned.length;
    cursor = orphaned[orphaned.length - 1].id;

    const idsToDelete: string[] = [];

    for (const attachment of orphaned) {
      let shouldDeleteDbRecord = false;
      
      try {
        await StorageService.remove("attachments", [attachment.storagePath]);
        shouldDeleteDbRecord = true;
      } catch (err: any) {
        // Evaluate error specifics
        const statusCode = err?.status || err?.statusCode || (err as any)?.error?.statusCode;
        
        if (statusCode === 404) {
          // File missing from storage, safe to delete DB record
          shouldDeleteDbRecord = true;
        } else {
          // Timeout, permission error, network failure -> keep DB record for retry
          console.error(`[Cleanup] Failed to delete file ${attachment.storagePath} from Supabase:`, err);
          totalFailures += 1;
          shouldDeleteDbRecord = false;
        }
      }

      if (shouldDeleteDbRecord) {
        idsToDelete.push(attachment.id);
        totalBytesRecovered += attachment.size;
      }
    }

    if (idsToDelete.length > 0) {
      try {
        const result = await prisma.attachment.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
        totalDeleted += result.count;
      } catch (err) {
        console.error(`[Cleanup] DB deletion failed for attachments that were removed from storage. Inconsistency logged.`, err);
        // Do not crash. Allow retry/reconciliation later. 
        // Next run will see missing storage object (404) and safely delete DB record.
      }
    }
  }

  console.log(`[Cleanup] files scanned: ${totalScanned}, files deleted: ${totalDeleted}, bytes recovered: ${totalBytesRecovered}, failures: ${totalFailures}`);
}
