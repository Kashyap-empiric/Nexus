import { Worker } from "bullmq";
import { getBullConnectionOptions } from "./connection.js";
import { processPushToMembers, processPushToUser } from "./processors/pushNotification.processor.js";
import { processSendEmail } from "./processors/sendEmail.processor.js";
import { processRevokeInvite } from "./processors/revokeInvite.processor.js";
import { processFanOutNotification } from "./processors/fanOutNotification.processor.js";
import { processCleanup } from "./processors/cleanup.processor.js";
import { cleanupQueue } from "./queues.js";
import type {
  PushToMembersJob,
  PushNotificationJob,
  RevokeInviteJob,
  FanOutNotificationJob,
  SendEmailJob,
  CleanupJobData,
} from "./types.js";

const connection = getBullConnectionOptions();

export function startWorkers() {
  if (!connection) {
    console.warn("[BullMQ] No Redis connection — workers not started");
    return;
  }

  new Worker(
    "notifications",
    (job) => {
      switch (job.name) {
        case "push-to-members":
          return processPushToMembers(job.data as PushToMembersJob);
        case "push-to-user":
          return processPushToUser(job.data as PushNotificationJob);
        case "revoke-invite":
          return processRevokeInvite(job.data as RevokeInviteJob);
        case "fan-out-notification":
          return processFanOutNotification(job.data as FanOutNotificationJob);
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
          return processSendEmail(job.data as SendEmailJob);
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
          return processCleanup(job.data as CleanupJobData);
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
