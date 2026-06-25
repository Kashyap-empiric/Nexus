import { prisma } from "@/lib/db.js";
import type { Prisma } from "@prisma/client";


export const findMessages = async (
  conversationId: string,
  cursor: string | undefined,
  limit: number
) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      OR: [
        { threadRootId: null },
        { isThreadBroadcast: true }
      ],
      deletedAt: null,
    },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: "desc" },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      replyTo: {
        select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
      },
    },
  });
};

export const findById = async (messageId: string) => {
  return prisma.message.findUnique({
    where: { id: messageId },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      conversation: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          latestMessageId: true,
        },
      },
    },
  });
};

export const searchMessages = async (query: string, userId: string, limit: number) => {
  return prisma.message.findMany({
    where: {
      content: { contains: query, mode: "insensitive" },
      deletedAt: null,
      conversation: {
        members: { some: { userId } },
      },
    },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      conversation: {
        select: { id: true, name: true, type: true, workspaceId: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};


export const getPinnedMessages = async (conversationId: string) => {
  return prisma.pinnedMessage.findMany({
    where: { conversationId, message: { deletedAt: null } },
    include: {
      message: {
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
          },
        },
      },
      pinnedByUser: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createPin = async (messageId: string, conversationId: string, pinnedBy: string) => {
  return prisma.pinnedMessage.create({
    data: { messageId, conversationId, pinnedBy },
    include: {
      message: {
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
          },
        },
      },
      pinnedByUser: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });
};

export const deletePin = async (messageId: string) => {
  return prisma.pinnedMessage.delete({
    where: { messageId },
  });
};

export const deletePinInTransaction = async (tx: Prisma.TransactionClient, messageId: string) => {
  return tx.pinnedMessage.deleteMany({
    where: { messageId },
  });
};

export const findPinByMessageId = async (messageId: string) => {
  return prisma.pinnedMessage.findUnique({
    where: { messageId },
  });
};

export const findPinnedMessageIds = async (conversationId: string): Promise<string[]> => {
  const pins = await prisma.pinnedMessage.findMany({
    where: { conversationId },
    select: { messageId: true },
  });
  return pins.map(p => p.messageId);
};


export const createMessageTransaction = async (
  conversationId: string,
  userId: string,
  content: string,
  messageId: string,
  replyToId?: string | null,
  threadRootId?: string | null,
  isThreadBroadcast?: boolean
) => {
  const operations: any[] = [];

  if (threadRootId) {
    operations.push(
      prisma.message.create({
        data: { id: messageId, conversationId, userId, content, replyToId: replyToId ?? undefined, threadRootId, isThreadBroadcast: isThreadBroadcast ?? false },
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
          },
          replyTo: {
            select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
          },
        },
      }),
      prisma.message.update({
        where: { id: threadRootId },
        data: {
          threadReplyCount: { increment: 1 },
          lastThreadReplyAt: new Date(),
        },
      }),
    );
  } else {
    operations.push(
      prisma.message.create({
        data: { id: messageId, conversationId, userId, content, replyToId: replyToId ?? undefined, isThreadBroadcast: isThreadBroadcast ?? false },
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
          },
          replyTo: {
            select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
          },
        },
      }),
    );
  }

  operations.push(
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        latestMessageId: messageId,
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        latestMessageId: true,
      },
    }),
    prisma.conversationMember.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { lastReadMessageId: messageId },
    }),
  );

  return prisma.$transaction(operations);
};

export const findThreadMessages = async (threadRootId: string) => {
  const messages = await prisma.message.findMany({
    where: {
      threadRootId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      replyTo: {
        select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
      },
    },
  });
  return messages;
};

export const findThreadParticipants = async (threadRootId: string): Promise<string[]> => {
  const rows = await prisma.message.findMany({
    where: { threadRootId },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map(r => r.userId);
};

export const findChannelThreads = async (conversationId: string) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      threadRootId: null,
      threadReplyCount: { gt: 0 },
      deletedAt: null,
    },
    orderBy: { lastThreadReplyAt: "desc" },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
      threadReplies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, deletedAt: true },
      },
    },
  });
};

export const findWorkspaceThreads = async (workspaceId: string, userId: string) => {
  console.log("[Threads Query] starting with workspaceId", workspaceId, "userId", userId);
  const result = await prisma.message.findMany({
    where: {
      conversation: {
        workspaceId,
        members: { some: { userId } },
      },
      threadRootId: null,
      threadReplyCount: { gt: 0 },
      deletedAt: null,
      OR: [
        { userId },
        { threadReplies: { some: { userId, deletedAt: null } } },
        { mentions: { some: { userId } } },
        { threadReplies: { some: { mentions: { some: { userId } }, deletedAt: null } } }
      ],
    },
    orderBy: { lastThreadReplyAt: "desc" },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
      threadReplies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, deletedAt: true },
      },
    },
  });
  console.log("[Threads Query] completed, rows:", result.length);
  return result;
};

export const updateMessage = async (
  messageId: string,
  content: string
) => {
  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: content.trim(),
      isEdited: true,
    },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      replyTo: {
        select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
      },
    },
  });
};


export const findNextLatestMessageInTransaction = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  excludedId: string
) => {
  return tx.message.findFirst({
    where: {
      conversationId,
      id: { not: excludedId },
      deletedAt: null,
    },
    orderBy: { id: "desc" },
  });
};

export const softDeleteMessageInTransaction = async (
  tx: Prisma.TransactionClient,
  messageId: string
) => {
  return tx.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
      },
      replyTo: {
        select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
      },
    },
  });
};

export const updateConversationLatestMessageInTransaction = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  latestMessageId: string | null
) => {
  return tx.conversation.update({
    where: { id: conversationId },
    data: { latestMessageId },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      latestMessageId: true,
      latestMessage: {
        select: {
          id: true,
          userId: true,
          content: true,
          deletedAt: true,
          createdAt: true,
          user: { select: { username: true, fullName: true } },
        },
      },
    },
  });
};
