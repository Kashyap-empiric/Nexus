import { uuidv7 } from "uuidv7";
import * as messagesRepo from "./messages.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";

export const getMessages = async (conversationId: string, cursor: string | undefined, limit: number) => {
  const messages = await messagesRepo.findMessages(conversationId, cursor, limit);

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
  const [message, conversation] = await messagesRepo.createMessageTransaction(
    conversationId,
    userId,
    content,
    messageId
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

  return { message, conversationMetadata };
};

export const getMessageById = async (messageId: string) => {
  return messagesRepo.findById(messageId);
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
