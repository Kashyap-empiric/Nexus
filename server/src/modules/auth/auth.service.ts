import * as authRepo from "./auth.repository.js";

export const isWorkspaceMember = async (userId: string, workspaceId: string): Promise<boolean> => {
  const member = await authRepo.findWorkspaceMember(userId, workspaceId);
  return !!member;
};

export const verifyConversationMembership = async (userId: string, conversationId: string): Promise<boolean> => {
  return authRepo.checkConversationAccess(userId, conversationId);
};

export const getUserConversationMemberships = async (userId: string) => {
  return authRepo.findConversationMembershipsByUserId(userId);
};

export const getUserWorkspaceChannels = async (userId: string) => {
  return authRepo.findWorkspaceChannelsByUserId(userId);
};

export const getUserWorkspaceIds = async (userId: string): Promise<string[]> => {
  return authRepo.findUserWorkspaceIds(userId);
};
