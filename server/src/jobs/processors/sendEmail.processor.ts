import type { Job } from "bullmq";
import type { SendEmailJob } from "../types.js";

export async function processSendEmail(job: Job<SendEmailJob>) {
  console.log(`[Job] send-email to=${job.data.to} type=${job.data.type}`);
}
