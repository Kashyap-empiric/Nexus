import * as authRepo from "./auth.repository.js";

export const isWorkspaceMember = async (userId: string, workspaceId: string): Promise<boolean> => {
  const member = await authRepo.findWorkspaceMember(userId, workspaceId);
  return !!member;
};

export const verifyConversationMembership = async (userId: string, conversationId: string): Promise<boolean> => {
  const member = await authRepo.findConversationMember(userId, conversationId);
  return !!member;
};

export const getUserConversationMemberships = async (userId: string) => {
  return authRepo.findConversationMembershipsByUserId(userId);
};
