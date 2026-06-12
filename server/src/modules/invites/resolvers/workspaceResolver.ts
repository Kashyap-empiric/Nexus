import type { InviteResolver, ResolveInviteContext } from "./index.js";
import * as workspacesRepo from "../../workspaces/workspaces.repository.js";

export const workspaceInviteResolver: InviteResolver = {
  async resolve({ tx, invite, actorId }: ResolveInviteContext) {
    const workspaceId = invite.entityId;

    // Verify workspace exists
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    // Call the onboarding service to securely handle joining the workspace & default channels
    const { generalChannelId } = await workspacesRepo.onboardUserToWorkspaceInTransaction(tx as any, workspaceId, actorId);

    // Return the new dedicated workspace route structure
    return {
      redirectUrl: `/workspaces/${workspaceId}/channels/${generalChannelId}`,
    };
  }
};
