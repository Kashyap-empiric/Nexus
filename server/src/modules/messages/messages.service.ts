import { prisma } from "@/lib/db.js";
import { uuidv7 } from "uuidv7";

export const getMessages = async (conversationId: string, cursor: string | undefined, limit: number) => {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasNextPage = messages.length > limit;

  if (hasNextPage) {
    messages.pop();
  }

  const nextCursor = hasNextPage ? messages[messages.length - 1].id : null;

  return {
    messages,
    nextCursor,
  };
};

export const createMessage = async (conversationId: string, userId: string, content: string) => {
  const message = await prisma.message.create({
    data: {
      id: uuidv7(),
      conversationId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  return message;
};

export const getMessageById = async (messageId: string) => {
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });
};
