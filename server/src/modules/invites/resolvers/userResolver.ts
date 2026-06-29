import type { InviteResolver, ResolveInviteContext } from "./index.js";
import { createOrGetDM } from "../../conversations/conversations.service.js";

export const userInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    const { tx, invite, actorId } = context;
    
    const result = await createOrGetDM(actorId, invite.entityId, tx as unknown as Parameters<typeof createOrGetDM>[2]);

    const events = [];
    if (result.created) {
      events.push({
        type: "CONVERSATION_NEW",
        conversationId: result.conversation.id,
        payload: result.conversation,
      });
    }

    return {
      redirectUrl: `/conversations/${result.conversation.id}`,
      consumed: result.created, 
      events,
    };
  }
};
