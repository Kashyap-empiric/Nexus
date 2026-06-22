import { Prisma } from "@prisma/client";
import type { InviteResolver, ResolveInviteContext } from "./index.js";

export const channelInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    const { tx, invite, actorId } = context;
    const channelId = invite.entityId;

    const channel = await tx.conversation.findUnique({
      where: { id: channelId },
      select: { id: true, type: true, workspaceId: true, name: true },
    });

    if (!channel) {
      throw new Error("CHANNEL_NOT_FOUND");
    }

    let membershipCreated = true;
    try {
      await tx.conversationMember.create({
        data: {
          userId: actorId,
          conversationId: channelId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        membershipCreated = false;
      } else {
        throw error;
      }
    }

    const events = [];
    if (membershipCreated) {
      events.push({
        type: "CONVERSATION_UPDATE" as const,
        conversationId: channelId,
        userId: actorId,
      });
    }

    return {
      redirectUrl: channel.workspaceId
        ? `/workspaces/${channel.workspaceId}/channels/${channelId}`
        : `/conversations/${channelId}`,
      consumed: membershipCreated,
      alreadyMember: !membershipCreated,
      events,
    };
  }
};
