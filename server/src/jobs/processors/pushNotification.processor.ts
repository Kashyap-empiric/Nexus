import type { Job } from "bullmq";
import type { PushNotificationJob } from "../types.js";

export async function processPushNotification(job: Job<PushNotificationJob>) {
  console.log(`[Job] push-notification user=${job.data.userId} tag=${job.data.payload.tag}`);
}
