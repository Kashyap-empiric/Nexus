import { uuidv7 } from "uuidv7";
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/app-error.js";
import * as messagesRepo from "./messages.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import { sendPushNotification } from "@/services/push.service.js";
import { createAndDispatch } from "../notifications/notifications.service.js";
import { dispatchPinEvent } from "@/socket/socket.dispatcher.js";
import { prisma } from "@/lib/db.js";
import { findWorkspaceMember } from "../auth/auth.repository.js";

/**
 * Send push notifications to conversation members for a new message.
 * Checks each member's notification preferences (DM, channel, mention).
 * This is shared between the socket handler and HTTP endpoint.
 * Note: In-app notifications for message events (MENTION, DIRECT_MESSAGE, CHANNEL_MESSAGE)
 * are not created yet — those features are in a future milestone.
 */
export const sendMessageNotifications = async (
  conversationId: string,
  senderId: string,
  senderUsername: string,
  content: string,
  /** User ID to skip — used when the user already received a reply notification */
  excludeUserId?: string | null
): Promise<void> => {
  try {
    const conv = await conversationsRepo.findById(conversationId);
    if (!conv) return;

    const notificationLink = conv.type === "CHANNEL" && conv.workspaceId
      ? `/workspaces/${conv.workspaceId}/channels/${conversationId}?highlight=latest`
      : `/conversations/${conversationId}`;

    const targetMembers = conv.members.filter(
      m => m.userId !== senderId && m.userId !== excludeUserId
    );

    if (targetMembers.length === 0) return;

    const memberIds = targetMembers.map(m => m.userId);
    const memberUsers = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        pushNotificationsEnabled: true,
        dmNotifications: true,
        channelNotifications: true,
        mentionNotifications: true,
        username: true,
      },
    });

    const userPrefsMap = new Map(memberUsers.map(u => [u.id, u]));

    const notificationPromises = targetMembers.map(async (member) => {
      const memberUser = userPrefsMap.get(member.userId);
      if (!memberUser || !memberUser.pushNotificationsEnabled) return;

      const isMentioned = new RegExp(`@${escapeRegex(memberUser.username)}\\b`).test(content);
      let shouldNotify = false;

      if (conv.type === "DM" && memberUser.dmNotifications) {
        shouldNotify = true;
      } else if (conv.type === "CHANNEL") {
        if (memberUser.mentionNotifications && isMentioned) {
          shouldNotify = true;
        } else if (memberUser.channelNotifications) {
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        const prefix = conv.type === "CHANNEL" && conv.name ? `#${conv.name}\n\n${senderUsername}` : senderUsername;
        await sendPushNotification(member.userId, {
          title: "Nexus",
          body: `${prefix}: ${content}`,
          url: notificationLink,
          tag: conversationId,
        });
      }
    });

    await Promise.all(notificationPromises);
  } catch (err) {
    console.error("[Message Notifications] Failed to send notifications:", err);
  }
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

export const createMessage = async (conversationId: string, userId: string, content: string, replyToId?: string | null) => {
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

  const [message, conversation] = await messagesRepo.createMessageTransaction(
    conversationId,
    userId,
    content,
    messageId,
    replyToId
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

  return { message, conversationMetadata, parentMessageUserId };
};

export const searchMessages = async (query: string, userId: string, limit: number) => {
  return messagesRepo.searchMessages(query, userId, limit);
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
