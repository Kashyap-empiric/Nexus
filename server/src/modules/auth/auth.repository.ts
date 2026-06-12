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

export const findConversationMember = async (
  userId: string,
  conversationId: string
) => {
  return prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
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
