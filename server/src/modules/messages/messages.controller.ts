import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { AppError } from "@/lib/app-error.js";
import * as messagesService from "./messages.service.js";
import { getMessagesQuerySchema, type CreateMessageBody, type GetMessagesQuery, type UpdateMessageBody, type SearchMessagesQuery } from "./messages.schema.js";
import { dispatchMessageEvent } from "@/socket/socket.dispatcher.js";

export const pinMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };

    const pin = await messagesService.pinMessage(messageId, conversationId, userId);

    res.status(201).json({ data: pin });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error pinning message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unpinMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };

    const result = await messagesService.unpinMessage(messageId, conversationId, userId);

    res.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error unpinning message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPinnedMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params as { conversationId: string };

    const pins = await messagesService.getPinnedMessages(conversationId);

    res.json({ data: pins });
  } catch (error) {
    console.error("Error fetching pinned messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { q, limit } = req.query as unknown as SearchMessagesQuery;

    const messages = await messagesService.searchMessages(q, userId, limit);

    res.json({ data: messages });
  } catch (error) {
    console.error("Error searching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params as { conversationId: string };
    const { cursor, limit } = req.query as unknown as GetMessagesQuery;

    const { messages, nextCursor, pinnedMessageIds } = await messagesService.getMessages(conversationId, cursor, limit);

    res.json({
      data: messages,
      nextCursor,
      pinnedMessageIds,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getThreadMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };

    const { root, replies } = await messagesService.getThreadMessages(conversationId, messageId);

    res.json({ data: { root, replies } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching thread messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChannelThreads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId } = req.params as { conversationId: string };
    const threads = await messagesService.getChannelThreads(conversationId);
    res.json({ data: threads });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching channel threads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceThreads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const threads = await messagesService.getWorkspaceThreads(workspaceId, userId);
    res.json({ data: threads });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching workspace threads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params as { conversationId: string };
    const { content, replyToId, threadRootId, isThreadBroadcast } = req.body as CreateMessageBody & { replyToId?: string; threadRootId?: string; isThreadBroadcast?: boolean };

    const { message, conversationMetadata, parentMessageUserId } = await messagesService.createMessage(conversationId, userId, content, replyToId, threadRootId, isThreadBroadcast);

    try {
      dispatchMessageEvent("NEW", conversationId, message, conversationMetadata);
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:new from HTTP endpoint", err);
    }

    try {
      await messagesService.sendMessageNotifications(
        conversationId,
        userId,
        message.user?.username || "Unknown",
        content,
        parentMessageUserId
      );
    } catch (notifErr) {
      console.error("[Message Push] Failed to send push notifications from HTTP endpoint:", notifErr);
    }

    res.status(201).json({
      data: message,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };
    const { content } = req.body as UpdateMessageBody;

    const { message, conversationMetadata } = await messagesService.editMessage(messageId, conversationId, userId, content);

    try {
      dispatchMessageEvent("UPDATE", conversationId, message, conversationMetadata);
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:update from HTTP endpoint", err);
    }

    res.json({
      data: message,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error updating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };

    const { message, conversationMetadata } = await messagesService.deleteMessage(messageId, conversationId, userId);

    try {
      dispatchMessageEvent("DELETE", conversationId, message, conversationMetadata);
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:delete from HTTP endpoint", err);
    }

    res.json({
      data: message,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
