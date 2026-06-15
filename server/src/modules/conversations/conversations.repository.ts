import { prisma } from "@/lib/db.js";
import { Prisma } from "@prisma/client";

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

export const findChannelIdsByWorkspaceId = async (workspaceId: string, userId?: string) => {
  const where: any = { workspaceId, type: "CHANNEL" };

  if (userId) {
    where.OR = [
      { visibility: "PUBLIC" },
      {
        visibility: "PRIVATE",
        members: { some: { userId } },
      },
    ];
  }

  return prisma.conversation.findMany({
    where,
    select: { id: true, workspaceId: true },
  });
};

export const findChannelIdsByWorkspaceIds = async (
  workspaceIds: string[],
  userId?: string
) => {
  const where: any = {
    workspaceId: { in: workspaceIds },
    type: "CHANNEL",
  };

  if (userId) {
    where.OR = [
      { visibility: "PUBLIC" },
      {
        visibility: "PRIVATE",
        members: { some: { userId } },
      },
    ];
  }

  return prisma.conversation.findMany({
    where,
    select: { id: true, workspaceId: true },
  });
};

export const findChannelByWorkspaceId = async (workspaceId: string, userId?: string) => {
  const where: any = {
    workspaceId,
    type: "CHANNEL",
  };

  if (userId) {
    where.OR = [
      { visibility: "PUBLIC" },
      {
        visibility: "PRIVATE",
        members: { some: { userId } },
      },
    ];
  }

  return prisma.conversation.findMany({
    where,
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
    orderBy: { createdAt: "asc" },
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

interface UnreadCountRow {
  conversationId: string;
  count: number;
}

/**
 * Count unread messages for multiple conversations in a single query.
 * Uses an INNER JOIN with ConversationMember so only conversations where the
 * user has a membership record are included.
 *
 * - No membership record → excluded (caller treats as 0)
 * - Has membership, lastReadMessageId is NULL → counts all messages (never read)
 * - Has membership, lastReadMessageId is set → counts messages with id > lastRead
 */
export const countUnreadByConversations = async (
  userId: string,
  conversationIds: string[]
): Promise<Map<string, number>> => {
  if (conversationIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<UnreadCountRow[]>`
    SELECT
      m."conversationId",
      COUNT(*)::int AS "count"
    FROM "Message" m
    INNER JOIN "ConversationMember" cm
      ON cm."conversationId" = m."conversationId"
      AND cm."userId" = ${userId}
    WHERE
      m."conversationId" IN (${Prisma.join(conversationIds)})
      AND m."userId" != ${userId}
      AND m."deletedAt" IS NULL
      AND (cm."lastReadMessageId" IS NULL OR m."id" > cm."lastReadMessageId")
    GROUP BY m."conversationId"
  `;

  const resultMap = new Map<string, number>();
  for (const row of rows) {
    resultMap.set(row.conversationId, row.count);
  }
  return resultMap;
};

// ====== Writes ======

export const createDM = async (data: {
  id: string;
  type: "DM";
  workspaceId: null;
  isPrivate: true;
  dmPair: string;
  members: {
    create: Array<{ userId: string }>;
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
  return prisma.conversationMember.updateMany({
    where: {
      conversationId,
      userId,
    },
    data: { lastReadMessageId: messageId },
  });
};
