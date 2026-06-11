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
  const messageId = uuidv7();
  const [message, conversation] = await prisma.$transaction([
    prisma.message.create({
      data: {
        id: messageId,
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
      data: { 
        updatedAt: new Date(),
        latestMessageId: messageId,
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        latestMessageId: true,
      }
    }),
    prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: messageId,
      },
    })
  ]);

  const conversationMetadata = {
    ...conversation,
    latestMessage: {
      id: message.id,
      userId: message.userId,
      content: message.content,
      deletedAt: message.deletedAt,
      createdAt: message.createdAt,
      user: {
        username: message.user.username
      }
    }
  };

  return { message, conversationMetadata };
};

export const getMessageById = async (messageId: string) => {
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      conversation: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          latestMessageId: true,
        }
      }
    }
  });
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
  const updatedMessage = await prisma.message.update({
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
  });

  let conversationMetadata = null;
  if (message.conversation?.latestMessageId === messageId) {
    conversationMetadata = {
      id: message.conversation.id,
      name: message.conversation.name,
      updatedAt: message.conversation.updatedAt,
      latestMessageId: message.conversation.latestMessageId,
      latestMessage: {
        id: updatedMessage.id,
        userId: updatedMessage.userId,
        content: updatedMessage.content,
        deletedAt: updatedMessage.deletedAt,
        createdAt: updatedMessage.createdAt,
        user: {
          username: updatedMessage.user.username
        }
      }
    };
  }

  return { message: updatedMessage, conversationMetadata };
}

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

  const conversation = message.conversation;

  let nextLatestMessageId = conversation?.latestMessageId;

  if (conversation?.latestMessageId === messageId) {
    const nextMessage = await prisma.message.findFirst({
      where: {
        conversationId: message.conversationId,
        id: { not: messageId },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    nextLatestMessageId = nextMessage ? nextMessage.id : null;
  }

  return prisma.$transaction(async (tx) => {
    const updatedMessage = await tx.message.update({
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

    let conversationMetadata = null;

    if (conversation?.latestMessageId === messageId) {
      conversationMetadata = await tx.conversation.update({
        where: { id: message.conversationId },
        data: { latestMessageId: nextLatestMessageId },
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
              user: {
                select: {
                  username: true
                }
              }
            }
          }
        }
      });
    }

    return { message: updatedMessage, conversationMetadata };
  });
};
