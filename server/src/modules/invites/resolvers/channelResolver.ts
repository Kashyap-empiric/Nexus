import type { InviteResolver, ResolveInviteContext } from "./index.js";

export const channelInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    throw new Error("NOT_IMPLEMENTED");
  }
};
