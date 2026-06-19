import { Prisma } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import type { InviteResolver, ResolveInviteContext } from "./index.js";

export const conversationInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    const { tx, invite, actorId } = context;

    let membershipCreated = true;

    try {
      const conversation = await tx.conversation.findUnique({
        where: { id: invite.entityId },
        select: { type: true }
      });
      if (conversation?.type === "DM") {
        throw new Error("CANNOT_JOIN_DM_VIA_CONVERSATION_INVITE");
      }

      await tx.conversationMember.create({
        data: {
          userId: actorId,
          conversationId: invite.entityId,
        }
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
        type: "CONVERSATION_UPDATE",
        conversationId: invite.entityId,
        userId: actorId, 
      });
    }

    return {
      redirectUrl: `/conversations/${invite.entityId}`,
      consumed: membershipCreated, 
      events,
    };
  }
};
