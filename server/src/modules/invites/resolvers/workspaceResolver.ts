import type { InviteResolver, ResolveInviteContext } from "./index.js";

export const workspaceInviteResolver: InviteResolver = {
  async resolve(context: ResolveInviteContext) {
    throw new Error("NOT_IMPLEMENTED");
  }
};
