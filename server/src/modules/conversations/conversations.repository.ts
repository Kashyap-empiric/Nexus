import { prisma } from "@/lib/db.js";
import { Prisma } from "@prisma/client";


export const findById = async (id: string) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
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
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
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
            select: { username: true, fullName: true },
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

export const findDMByPairInTransaction = async (tx: Prisma.TransactionClient, dmPair: string) => {
  return tx.conversation.findUnique({
    where: { dmPair },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
};

export const findChannelIdsByWorkspaceId = async (workspaceId: string, userId?: string, ownerWorkspaceIds?: Set<string>) => {
  const where: Prisma.ConversationWhereInput = { workspaceId, type: "CHANNEL" };

  if (userId && !ownerWorkspaceIds?.has(workspaceId)) {
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
  userId?: string,
  ownerWorkspaceIds?: Set<string>
) => {
  if (workspaceIds.length === 0) return [];

  const where: Prisma.ConversationWhereInput = {
    type: "CHANNEL",
  };

  if (userId) {
    const conditions: Prisma.ConversationWhereInput[] = [];

    const ownedIds = ownerWorkspaceIds?.size
      ? workspaceIds.filter(id => ownerWorkspaceIds.has(id))
      : [];
    if (ownedIds.length > 0) {
      conditions.push({ workspaceId: { in: ownedIds } });
    }

    const nonOwnedIds = workspaceIds.filter(id => !ownedIds.includes(id));
    if (nonOwnedIds.length > 0) {
      conditions.push({
        workspaceId: { in: nonOwnedIds },
        OR: [
          { visibility: "PUBLIC" },
          {
            visibility: "PRIVATE",
            members: { some: { userId } },
          },
        ],
      });
    }

    if (conditions.length > 0) {
      where.OR = conditions;
    }
  } else {
    where.workspaceId = { in: workspaceIds };
  }

  return prisma.conversation.findMany({
    where,
    select: { id: true, workspaceId: true },
  });
};

export const findChannelByWorkspaceId = async (workspaceId: string, userId?: string, ownerWorkspaceIds?: Set<string>) => {
  const where: Prisma.ConversationWhereInput = {
    workspaceId,
    type: "CHANNEL",
  };

  if (userId && !ownerWorkspaceIds?.has(workspaceId)) {
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
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
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
            select: { username: true, fullName: true },
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

export const createDMInTransaction = async (
  tx: Prisma.TransactionClient,
  data: {
    id: string;
    type: "DM";
    workspaceId: null;
    isPrivate: true;
    dmPair: string;
    members: {
      create: Array<{ userId: string }>;
    };
  }
) => {
  return tx.conversation.create({
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
