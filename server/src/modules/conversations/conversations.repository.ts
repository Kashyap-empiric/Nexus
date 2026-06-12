import { prisma } from "@/lib/db.js";

// ====== Reads ======

export const findById = async (id: string) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
    },
  });
};

export const findDMsByUserId = async (userId: string) => {
  return prisma.conversation.findMany({
    where: {
      members: { some: { userId } },
      type: "DM",
      workspaceId: null,
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
      latestMessage: {
        select: {
          id: true,
          userId: true,
          content: true,
          deletedAt: true,
          createdAt: true,
          user: {
            select: { username: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const findDMByPair = async (dmPair: string) => {
  return prisma.conversation.findUnique({
    where: { dmPair },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
};

export const findChannelIdsByWorkspaceId = async (workspaceId: string) => {
  return prisma.conversation.findMany({
    where: { workspaceId, type: "CHANNEL" },
    select: { id: true },
  });
};

export const findChannelByWorkspaceId = async (workspaceId: string) => {
  return prisma.conversation.findMany({
    where: {
      workspaceId,
      type: "CHANNEL",
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
      latestMessage: {
        select: {
          id: true,
          userId: true,
          content: true,
          deletedAt: true,
          createdAt: true,
          user: {
            select: { username: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const findConversationByIdForInvite = async (
  id: string,
  userId: string
) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: { members: { where: { userId } } },
  });
};

// ====== Counts ======

export const countUnreadMessages = async (
  conversationId: string,
  userId: string,
  lastReadMessageId?: string | null
) => {
  const whereClause: Record<string, unknown> = {
    conversationId,
    userId: { not: userId },
  };

  if (lastReadMessageId) {
    whereClause.id = { gt: lastReadMessageId };
  }

  return prisma.message.count({
    where: whereClause,
  });
};

// ====== Writes ======

export const createDM = async (data: {
  id: string;
  type: "DM";
  workspaceId: null;
  isPrivate: true;
  dmPair: string;
  members: {
    create: Array<{ id: string; userId: string }>;
  };
}) => {
  return prisma.conversation.create({
    data,
    include: {
      members: {
        include: { user: true },
      },
    },
  });
};

export const updateLastReadMessage = async (
  conversationId: string,
  userId: string,
  messageId: string
) => {
  return prisma.conversationMember.update({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    data: { lastReadMessageId: messageId },
  });
};
