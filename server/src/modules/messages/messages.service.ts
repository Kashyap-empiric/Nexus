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
  const [message] = await prisma.$transaction([
    prisma.message.create({
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
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })
  ]);

  return message;
};

export const editMessage = async (messageId: string, userId: string, content: string) => {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new Error("Message not found.")
  }
  if (message.deletedAt) {
    throw new Error("Cannot edit a deleted message.")
  }
  if (message.userId !== userId) {
    throw new Error("403 Forbidden")
  }
  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: content.trim(),
      isEdited: true,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true
        }
      }
    }
  })
}

export const getMessageById = async (messageId: string) => {
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });
};

export const deleteMessage = async (messageId: string, userId: string) => {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new Error("Message not found.");
  }
  if (message.deletedAt) {
    throw new Error("Message is already deleted.");
  }
  if (message.userId !== userId) {
    throw new Error("403 Forbidden");
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
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
};
