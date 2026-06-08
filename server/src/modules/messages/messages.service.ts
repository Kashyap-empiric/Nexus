import { prisma } from "@/lib/db.js";
import { uuidv7 } from "uuidv7";
import { getIO } from "@/socket/socket.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";

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

  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, message);
  } catch (err) {
    console.error("[Socket.io] Failed to emit message:new", err);
  }

  return message;
};

export const getMessageById = async (messageId: string) => {
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });
};
