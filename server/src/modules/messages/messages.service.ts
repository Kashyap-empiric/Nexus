import { uuidv7 } from "uuidv7";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/app-error.js";
import * as messagesRepo from "./messages.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import { createAndDispatch } from "../notifications/notifications.service.js";
import { notificationQueue } from "@/jobs/queues.js";
import { dispatchPinEvent } from "@/socket/socket.dispatcher.js";
import { prisma } from "@/lib/db.js";
import { findWorkspaceMember } from "../auth/auth.repository.js";


export const sendMessageNotifications = async (
  conversationId: string,
  senderId: string,
  senderUsername: string,
  content: string,
  excludeUserId?: string | null
): Promise<void> => {
  if (!notificationQueue) return;
  await notificationQueue.add("push-to-members", {
    conversationId,
    senderId,
    senderUsername,
    content,
    excludeUserId: excludeUserId ?? null,
  });
};

export const getMessages = async (conversationId: string, cursor: string | undefined, limit: number) => {
  const messages = await messagesRepo.findMessages(conversationId, cursor, limit);

  const hasNextPage = messages.length > limit;

  if (hasNextPage) {
    messages.pop();
  }

  const nextCursor = hasNextPage ? messages[messages.length - 1].id : null;

  const pinnedMessageIds = await messagesRepo.findPinnedMessageIds(conversationId);

  return {
    messages,
    nextCursor,
    pinnedMessageIds,
  };
};

export const createMessage = async (conversationId: string, userId: string, content: string, replyToId?: string | null, threadRootId?: string | null, isThreadBroadcast?: boolean) => {
  const messageId = uuidv7();

  let parentMessageUserId: string | null = null;
  if (replyToId) {
    const parentMessage = await messagesRepo.findById(replyToId);
    if (!parentMessage) {
      throw new BadRequestError("Reply target message not found.");
    }
    if (parentMessage.conversationId !== conversationId) {
      throw new BadRequestError("Cannot reply to a message in a different conversation.");
    }
    parentMessageUserId = parentMessage.userId;
  }

  if (threadRootId) {
    const rootMessage = await messagesRepo.findById(threadRootId);
    if (!rootMessage) {
      throw new BadRequestError("Thread root message not found.");
    }
    if (rootMessage.conversationId !== conversationId) {
      throw new BadRequestError("Thread root message does not belong to this conversation.");
    }
    if (rootMessage.deletedAt) {
      throw new BadRequestError("Cannot reply to a deleted thread root message.");
    }
    if (rootMessage.threadRootId) {
      throw new BadRequestError("Cannot nest threads. Thread root must be a top-level message.");
    }
  }

  const [message, conversation] = await messagesRepo.createMessageTransaction(
    conversationId,
    userId,
    content,
    messageId,
    replyToId,
    threadRootId,
    isThreadBroadcast
  );

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

  if (replyToId && parentMessageUserId && parentMessageUserId !== userId) {
    try {
      const conversation = await conversationsRepo.findById(conversationId);
      const channelName = conversation?.name;
      const isChannel = conversation?.type === "CHANNEL";
      const location = isChannel && channelName ? `#${channelName}` : "a conversation";

      const notificationLink = isChannel && conversation?.workspaceId
        ? `/workspaces/${conversation.workspaceId}/channels/${conversationId}?highlight=${message.id}`
        : `/conversations/${conversationId}?highlight=${message.id}`;

      await createAndDispatch({
        userId: parentMessageUserId,
        type: "MESSAGE_REPLIED",
        title: `Reply from ${message.user.username}`,
        body: message.content,
        link: notificationLink,
        metadata: {
          conversationId,
          messageId: message.id,
          replyToId,
          username: message.user.username,
        },
      });
    } catch (err) {
      console.error("[Reply Notification] Failed to create reply notification:", err);
    }
  }

  if (threadRootId) {
    try {
      const notifiedUserIds = new Set<string>();

      const rootMessage = await messagesRepo.findById(threadRootId);
      if (rootMessage && rootMessage.userId !== userId) {
        notifiedUserIds.add(rootMessage.userId);
      }

      const participants = await messagesRepo.findThreadParticipants(threadRootId);
      for (const pid of participants) {
        if (pid !== userId) {
          notifiedUserIds.add(pid);
        }
      }

      const conversation = await conversationsRepo.findById(conversationId);
      const channelName = conversation?.name;
      const isChannel = conversation?.type === "CHANNEL";
      const notificationLink = isChannel && conversation?.workspaceId
        ? `/workspaces/${conversation.workspaceId}/channels/${conversationId}?highlight=${message.id}`
        : `/conversations/${conversationId}?highlight=${message.id}`;

      for (const targetUserId of notifiedUserIds) {
        try {
          await createAndDispatch({
            userId: targetUserId,
            type: "THREAD_REPLY",
            title: `Reply from ${message.user.username}`,
            body: message.content,
            link: notificationLink,
            metadata: {
              conversationId,
              messageId: message.id,
              threadRootId,
              username: message.user.username,
            },
          });
        } catch (err) {
          console.error("[Thread Notification] Failed to create thread reply notification:", err);
        }
      }
    } catch (err) {
      console.error("[Thread Notification] Error processing thread notifications:", err);
    }
  }

  return { message, conversationMetadata, parentMessageUserId };
};

export const getThreadMessages = async (conversationId: string, messageId: string) => {
  const root = await messagesRepo.findById(messageId);
  if (!root) {
    throw new NotFoundError("Message not found.");
  }
  if (root.conversationId !== conversationId) {
    throw new BadRequestError("Message does not belong to this conversation.");
  }
  if (root.threadRootId) {
    throw new BadRequestError("Message is not a thread root.");
  }

  const replies = await messagesRepo.findThreadMessages(messageId);
  return { root, replies };
};

export const searchMessages = async (query: string, userId: string, limit: number) => {
  return messagesRepo.searchMessages(query, userId, limit);
};

function mapToThreadSummary(threadRoot: any): any {
  return {
    threadRootId: threadRoot.id,
    conversationId: threadRoot.conversationId,
    rootMessagePreview: threadRoot.content,
    rootAuthor: {
      id: threadRoot.user.id,
      username: threadRoot.user.username,
      avatarUrl: threadRoot.user.avatarUrl,
    },
    replyCount: threadRoot.threadReplyCount,
    lastReplyAt: threadRoot.lastThreadReplyAt ? threadRoot.lastThreadReplyAt.toISOString() : threadRoot.createdAt.toISOString(),
    lastReplyPreview: threadRoot.threadReplies.length > 0 ? threadRoot.threadReplies[0].content : null,
  };
}

export const getChannelThreads = async (conversationId: string) => {
  const threads = await messagesRepo.findChannelThreads(conversationId);
  return threads.map(mapToThreadSummary);
};

export const getWorkspaceThreads = async (slugOrId: string, userId: string) => {
  console.log("[Threads] looking up workspace", slugOrId);
  let workspace = await prisma.workspace.findUnique({
    where: { slug: slugOrId },
    select: { id: true },
  });
  if (!workspace) {
    console.log("[Threads] not found by slug, trying id", slugOrId);
    workspace = await prisma.workspace.findUnique({
      where: { id: slugOrId },
      select: { id: true },
    });
  }
  if (!workspace) throw new NotFoundError("Workspace not found");
  console.log("[Threads] found workspace", workspace.id, "fetching threads");
  const threads = await messagesRepo.findWorkspaceThreads(workspace.id, userId);
  console.log("[Threads] found", threads.length, "threads");
  return threads.map(mapToThreadSummary);
};

export const pinMessage = async (messageId: string, conversationId: string, userId: string) => {
  const message = await messagesRepo.findById(messageId);
  if (!message) {
    throw new NotFoundError("Message not found.");
  }
  if (message.conversationId !== conversationId) {
    throw new BadRequestError("Message does not belong to this conversation.");
  }

  const conversation = await conversationsRepo.findById(conversationId);
  if (conversation?.workspaceId) {
    const member = await findWorkspaceMember(userId, conversation.workspaceId);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      throw new ForbiddenError("Only workspace owners and admins can pin messages.");
    }
  }

  const existing = await messagesRepo.findPinByMessageId(messageId);
  if (existing) {
    throw new ConflictError("Message is already pinned.");
  }
  const pin = await messagesRepo.createPin(messageId, conversationId, userId);
  dispatchPinEvent("pin", conversationId, {
    messageId,
    pinnedBy: userId,
    pinnedByUsername: pin.pinnedByUser.username,
  });
  return pin;
};

export const unpinMessage = async (messageId: string, conversationId: string, userId: string) => {
  const conversation = await conversationsRepo.findById(conversationId);
  if (conversation?.workspaceId) {
    const member = await findWorkspaceMember(userId, conversation.workspaceId);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      throw new ForbiddenError("Only workspace owners and admins can unpin messages.");
    }
  }

  const existing = await messagesRepo.findPinByMessageId(messageId);
  if (!existing) {
    throw new BadRequestError("Message is not pinned.");
  }
  await messagesRepo.deletePin(messageId);
  dispatchPinEvent("unpin", conversationId, {
    messageId,
    pinnedBy: userId,
  });
  return { messageId, conversationId };
};

export const getPinnedMessages = async (conversationId: string) => {
  return messagesRepo.getPinnedMessages(conversationId);
};

export const getMessageById = async (messageId: string) => {
  return messagesRepo.findById(messageId);
};

export const editMessage = async (messageId: string, conversationId: string, userId: string, content: string) => {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new NotFoundError("Message not found.")
  }
  if (message.deletedAt) {
    throw new BadRequestError("Cannot edit a deleted message.")
  }
  if (message.userId !== userId) {
    throw new ForbiddenError("Forbidden")
  }
  if (message.conversationId !== conversationId) {
    throw new BadRequestError("Message does not belong to this conversation.");
  }

  const updatedMessage = await messagesRepo.updateMessage(messageId, content);

  let conversationMetadata = null;
  if (message.conversation?.latestMessageId === messageId) {
    conversationMetadata = {
      id: message.conversation.id,
      name: message.conversation.name,
      updatedAt: new Date(),
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

export const deleteMessage = async (messageId: string, conversationId: string, userId: string) => {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new NotFoundError("Message not found.");
  }
  if (message.deletedAt) {
    throw new BadRequestError("Message is already deleted.");
  }
  if (message.userId !== userId) {
    throw new ForbiddenError("Forbidden");
  }
  if (message.conversationId !== conversationId) {
    throw new BadRequestError("Message does not belong to this conversation.");
  }

  const conversation = message.conversation;

  const result = await prismaTransaction(async (tx) => {
    let nextLatestMessageId = conversation?.latestMessageId;

    if (conversation?.latestMessageId === messageId) {
      const nextMessage = await messagesRepo.findNextLatestMessageInTransaction(
        tx,
        message.conversationId,
        messageId
      );
      nextLatestMessageId = nextMessage ? nextMessage.id : null;
    }

    const updatedMessage = await messagesRepo.softDeleteMessageInTransaction(tx, messageId);

    if (message.threadRootId) {
      await tx.message.update({
        where: { id: message.threadRootId },
        data: { threadReplyCount: { decrement: 1 } }
      });
    }

    if (message.threadReplyCount > 0) {
      await tx.message.updateMany({
        where: { threadRootId: messageId, deletedAt: null },
        data: { deletedAt: new Date() }
      });
    }

    await messagesRepo.deletePinInTransaction(tx, messageId);

    let conversationMetadata = null;

    if (conversation?.latestMessageId === messageId) {
      conversationMetadata = await messagesRepo.updateConversationLatestMessageInTransaction(
        tx,
        message.conversationId,
        nextLatestMessageId
      );
    }

    return { message: updatedMessage, conversationMetadata };
  });

  return result;
};

import { runTransaction as prismaTransaction } from "@/lib/transaction.js";
