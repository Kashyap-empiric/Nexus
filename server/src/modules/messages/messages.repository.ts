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
        select: { id: true, username: true, avatarUrl: true },
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

// ====== Writes ======

export const createMessageTransaction = async (
  conversationId: string,
  userId: string,
  content: string,
  messageId: string
) => {
  return prisma.$transaction([
    prisma.message.create({
      data: { id: messageId, conversationId, userId, content },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
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
    prisma.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      update: { lastReadMessageId: messageId },
      create: {
        conversationId,
        userId,
        lastReadMessageId: messageId,
      },
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
        select: { id: true, username: true, avatarUrl: true },
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
        select: { id: true, username: true, avatarUrl: true },
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
          user: { select: { username: true } },
        },
      },
    },
  });
};
