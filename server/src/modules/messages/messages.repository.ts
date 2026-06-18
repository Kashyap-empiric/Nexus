import { prisma } from "@/lib/db.js";
import type { Prisma } from "@prisma/client";

// ====== Reads ======

export const findMessages = async (
  conversationId: string,
  cursor: string | undefined,
  limit: number
) => {
  return prisma.message.findMany({
    where: {
      conversationId,
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

// ====== Pins ======

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

// ====== Writes ======

export const createMessageTransaction = async (
  conversationId: string,
  userId: string,
  content: string,
  messageId: string,
  replyToId?: string | null
) => {
  return prisma.$transaction([
    prisma.message.create({
      data: { id: messageId, conversationId, userId, content, replyToId: replyToId ?? undefined },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true, avatarPath: true },
        },
        replyTo: {
          select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } },
        },
      },
    }),
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
  ]);
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

// ====== Transaction Helpers (for use inside $transaction) ======

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
