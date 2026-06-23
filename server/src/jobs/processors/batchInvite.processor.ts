import { generateInviteService } from "@/modules/invites/invites.service.js";
import { createAndDispatch } from "@/modules/notifications/notifications.service.js";
import * as usersRepo from "@/modules/users/users.repository.js";
import * as workspacesRepo from "@/modules/workspaces/workspaces.repository.js";
import { emailQueue } from "@/jobs/queues.js";
import { ENV } from "@/config/env.js";
import type { BatchInviteJob, SendWorkspaceInviteData } from "../types.js";

export async function processBatchInvite(data: BatchInviteJob): Promise<void> {
  const {
    workspaceId,
    inviterId,
    inviterName,
    workspaceName,
    workspaceImageUrl,
    userIds,
  } = data;

  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(workspaceId);
  if (!workspace) {
    console.error(
      `[Job] batch-invite ✗ workspace ${workspaceId} not found`,
    );
    return;
  }

  const memberUserIds = new Set(workspace.members.map((m) => m.userId));

  let invited = 0;
  let skipped = 0;

  for (const targetUserId of userIds) {
    if (targetUserId === inviterId) {
      skipped++;
      continue;
    }

    if (memberUserIds.has(targetUserId)) {
      skipped++;
      continue;
    }

    try {
      const invite = await generateInviteService({
        type: "WORKSPACE",
        entityId: workspaceId,
        userId: inviterId,
        forceNew: true,
      });

      createAndDispatch({
        userId: targetUserId,
        type: "INVITE_RECEIVED",
        title: "Workspace invite",
        body: `You've been invited to ${workspaceName} by ${inviterName}`,
        link: `/invite?token=${invite.token}`,
        imageUrl: workspaceImageUrl || undefined,
        metadata: {
          workspaceId,
          workspaceName,
          inviterId,
          inviterName,
          token: invite.token,
        },
      }).catch((err) =>
        console.error(
          `[Job] batch-invite: Failed to dispatch INVITE_RECEIVED for ${targetUserId}:`,
          err,
        ),
      );

      try {
        const targetUser = await usersRepo.findUserById(targetUserId);
        if (targetUser?.email) {
          const baseUrl = ENV.CLIENT_URL || "http://localhost:3000";
          const inviteUrl = `${baseUrl}/invite?token=${invite.token}`;

          if (emailQueue) {
            const jobData: SendWorkspaceInviteData = {
              type: "workspace_invite",
              to: targetUser.email,
              inviteToken: invite.token,
              workspaceName,
              inviterName,
              inviteUrl,
              expiresAt: invite.expiresAt || null,
            };
            await emailQueue.add("send-email", jobData);
          }
        }
      } catch (emailErr) {
        console.error(
          `[Job] batch-invite: Email failed for ${targetUserId}:`,
          emailErr,
        );
      }

      invited++;
    } catch (err: any) {
      console.error(
        `[Job] batch-invite: Failed to invite user ${targetUserId}:`,
        err,
      );
      skipped++;
    }
  }

  console.log(
    `[Job] batch-invite ✓  workspace=${workspaceName}  invited=${invited}  skipped=${skipped}/${userIds.length}`,
  );
}
