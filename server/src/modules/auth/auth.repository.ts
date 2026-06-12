import { prisma } from "@/lib/db.js";

export const findWorkspaceMember = async (
  userId: string,
  workspaceId: string
) => {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
};

export const checkConversationAccess = async (userId: string, conversationId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      type: true,
      visibility: true,
      workspaceId: true,
      members: {
        where: { userId }
      }
    }
  });

  if (!conversation) return false;

  if (conversation.type === "DM" || conversation.visibility === "PRIVATE") {
    return conversation.members.length > 0;
  }

  if (conversation.type === "CHANNEL" && conversation.visibility === "PUBLIC") {
    if (!conversation.workspaceId) return false;
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: conversation.workspaceId, userId },
      },
    });
    return !!workspaceMember;
  }

  return false;
};

export const findConversationMembershipsByUserId = async (
  userId: string
) => {
  return prisma.conversationMember.findMany({
    where: {
      userId,
      conversation: { type: "DM" },
    },
    select: { conversationId: true },
  });
};

export const findWorkspaceChannelsByUserId = async (userId: string) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });

  if (memberships.length === 0) return [];

  const workspaceIds = memberships.map((m) => m.workspaceId);

  // Only return channels the user can access:
  // - PUBLIC channels → user is a workspace member, so they have access
  // - PRIVATE channels → user must be a ConversationMember
  return prisma.conversation.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      OR: [
        { visibility: "PUBLIC" },
        {
          visibility: "PRIVATE",
          members: { some: { userId } },
        },
      ],
    },
    select: { id: true },
  });
};

export const findUserWorkspaceIds = async (userId: string): Promise<string[]> => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  return memberships.map((m) => m.workspaceId);
};
