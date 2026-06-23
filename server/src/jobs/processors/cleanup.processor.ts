import type { Job } from "bullmq";
import type { CleanupJobData } from "../types.js";

export async function processCleanup(job: Job<CleanupJobData>) {
  console.log(`[Job] cleanup type=${job.data.type}`);
}
