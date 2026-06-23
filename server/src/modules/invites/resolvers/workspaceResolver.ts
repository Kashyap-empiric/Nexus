import type { InviteResolver, ResolveInviteContext } from "./index.js";
import type { CreateNotificationInput } from "../../notifications/notifications.types.js";
import * as workspacesRepo from "../../workspaces/workspaces.repository.js";

export const workspaceInviteResolver: InviteResolver = {
  async resolve({ tx, invite, actorId }: ResolveInviteContext) {
    const workspaceId = invite.entityId;
    const pendingNotifications: CreateNotificationInput[] = [];

    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!workspace) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    const existingMember = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
    });

    if (existingMember) {
      const generalChannel = await tx.conversation.findFirst({
        where: { workspaceId, name: "general", type: "CHANNEL" },
        select: { id: true },
      });

      return {
        redirectUrl: generalChannel
          ? `/workspaces/${workspaceId}/channels/${generalChannel.id}`
          : `/workspaces/${workspaceId}`,
        consumed: false,
        alreadyMember: true,
      };
    }

    const { generalChannelId } = await workspacesRepo.onboardUserToWorkspaceInTransaction(tx as any, workspaceId, actorId);

    try {
      const joiner = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true, username: true, avatarUrl: true },
      });

      if (joiner) {
        
        const adminMembers = await tx.workspaceMember.findMany({
          where: {
            workspaceId,
            userId: { not: actorId },
            role: { in: ["ADMIN", "OWNER"] },
          },
          select: { userId: true },
        });

        
        const targetIds = new Set(adminMembers.map(m => m.userId));
        if (invite.createdBy && invite.createdBy !== actorId) {
          targetIds.add(invite.createdBy);
        }

        if (targetIds.size > 0) {
          const generalChannel = await tx.conversation.findFirst({
            where: { workspaceId, name: "general", type: "CHANNEL" },
            select: { id: true },
          });

          const channelLink = generalChannel
            ? `/workspaces/${workspaceId}/channels/${generalChannel.id}`
            : undefined;

          for (const targetId of targetIds) {
            pendingNotifications.push({
              userId: targetId,
              type: "MEMBER_JOINED",
              title: "New member",
              body: `${joiner.username} joined the workspace`,
              link: channelLink,
              imageUrl: joiner.avatarUrl || undefined,
              metadata: {
                workspaceId,
                workspaceName: workspace.name,
                joinerId: joiner.id,
                joinerName: joiner.username,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("[workspaceResolver] Failed to collect MEMBER_JOINED notifications:", err);
    }

    try {
      const joiner = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true, username: true, avatarUrl: true },
      });

      if (joiner && invite.createdBy && invite.createdBy !== actorId) {
        pendingNotifications.push({
          userId: invite.createdBy,
          type: "INVITE_ACCEPTED",
          title: `${joiner.username} joined`,
          body: `${joiner.username} accepted your invite to ${workspace.name}`,
          link: `/workspaces/${workspaceId}/channels/${generalChannelId}`,
          imageUrl: joiner.avatarUrl || undefined,
          metadata: {
            workspaceId,
            workspaceName: workspace.name,
            joinerId: joiner.id,
            joinerName: joiner.username,
          },
        });
      }
    } catch (err) {
      console.error("[workspaceResolver] Failed to collect INVITE_ACCEPTED notification:", err);
    }

    return {
      redirectUrl: `/workspaces/${workspaceId}/channels/${generalChannelId}`,
      pendingNotifications: pendingNotifications.length > 0 ? pendingNotifications : undefined,
      events: [
        {
          type: "WORKSPACE_MEMBER_UPDATE",
          workspaceId,
          member: { userId: actorId }
        }
      ]
    };
  }
};
