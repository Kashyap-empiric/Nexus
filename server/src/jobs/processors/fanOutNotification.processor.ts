import type { Job } from "bullmq";
import type { FanOutNotificationJob } from "../types.js";

export async function processFanOutNotification(job: Job<FanOutNotificationJob>) {
  console.log(`[Job] fan-out type=${job.data.type} users=${job.data.userIds.length}`);
}
