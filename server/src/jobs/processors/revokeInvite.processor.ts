import type { Job } from "bullmq";
import type { RevokeInviteJob } from "../types.js";

export async function processRevokeInvite(job: Job<RevokeInviteJob>) {
  console.log(`[Job] revoke-invite token=${job.data.inviteToken.substring(0, 8)}...`);
}
