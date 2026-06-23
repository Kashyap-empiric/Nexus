import { revokeInviteByToken } from "@/modules/invites/invites.service.js";
import type { RevokeInviteJob } from "../types.js";

export async function processRevokeInvite(data: RevokeInviteJob): Promise<void> {
  const result = await revokeInviteByToken(data.inviteToken);

  if (result) {
    console.log(`[Job] revoke-invite ✓  token=${data.inviteToken.substring(0, 8)}...`);
  } else {
    console.warn(`[Job] revoke-invite not found  token=${data.inviteToken.substring(0, 8)}...`);
  }
}
