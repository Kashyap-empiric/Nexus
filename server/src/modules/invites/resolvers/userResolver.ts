import type { InviteResolver, ResolveInviteContext } from "./index.js";
import { createOrGetDM } from "../../conversations/conversations.service.js";

export const userInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    const { invite, actorId } = context;
    
    // For USER invites, entityId is the userId of the inviter
    const result = await createOrGetDM(actorId, invite.entityId);

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
      consumed: result.created, // Only consume the invite if a new DM was created
      events,
    };
  }
};
