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
      isPrivate: true,
      workspaceId: true,
      members: {
        where: { userId }
      }
    }
  });

  if (!conversation) return false;

  if (conversation.members.length > 0) return true;

  if (!conversation.isPrivate && conversation.workspaceId) {
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
