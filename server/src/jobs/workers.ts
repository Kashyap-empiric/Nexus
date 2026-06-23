import { Worker } from "bullmq";
import { getBullConnectionOptions } from "./connection.js";
import { processPushNotification } from "./processors/pushNotification.processor.js";
import { processSendEmail } from "./processors/sendEmail.processor.js";
import { processRevokeInvite } from "./processors/revokeInvite.processor.js";
import { processFanOutNotification } from "./processors/fanOutNotification.processor.js";
import { processCleanup } from "./processors/cleanup.processor.js";
import { cleanupQueue } from "./queues.js";

export function startWorkers() {
  const connection = getBullConnectionOptions();
  if (!connection) {
    console.warn("[BullMQ] No Redis connection — workers not started");
    return;
  }

  new Worker(
    "notifications",
    (job) => {
      switch (job.name) {
        case "push-to-user":
        case "push-to-members":
          return processPushNotification(job as any);
        case "revoke-invite":
          return processRevokeInvite(job as any);
        case "fan-out-notification":
          return processFanOutNotification(job as any);
        default:
          throw new Error(`Unknown notification job: ${job.name}`);
      }
    },
    { connection, concurrency: 10 },
  );

  new Worker(
    "email",
    (job) => {
      switch (job.name) {
        case "send-email":
          return processSendEmail(job as any);
        default:
          throw new Error(`Unknown email job: ${job.name}`);
      }
    },
    { connection, concurrency: 5 },
  );

  new Worker(
    "cleanup",
    (job) => {
      switch (job.name) {
        case "cleanup":
          return processCleanup(job as any);
        default:
          throw new Error(`Unknown cleanup job: ${job.name}`);
      }
    },
    { connection, concurrency: 1 },
  );

  if (cleanupQueue) {
    registerCleanupSchedules();
  }

  console.log("[BullMQ] Workers started");
}

async function registerCleanupSchedules() {
  if (!cleanupQueue) return;

  await cleanupQueue.upsertJobScheduler(
    "expired-invites",
    { pattern: "0 3 * * *" },
    { name: "cleanup", data: { type: "expired-invites" } },
  );

  await cleanupQueue.upsertJobScheduler(
    "expired-reset-tokens",
    { pattern: "0 3 * * *" },
    { name: "cleanup", data: { type: "expired-reset-tokens" } },
  );

  await cleanupQueue.upsertJobScheduler(
    "soft-deleted-messages",
    { pattern: "0 4 * * 0" },
    { name: "cleanup", data: { type: "soft-deleted-messages" } },
  );
}
