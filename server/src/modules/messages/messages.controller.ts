import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as messagesService from "./messages.service.js";
import { getMessagesQuerySchema, type CreateMessageBody, type GetMessagesQuery, type UpdateMessageBody } from "./messages.schema.js";

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params as { conversationId: string };
    const { cursor, limit } = req.query as unknown as GetMessagesQuery;

    const { messages, nextCursor } = await messagesService.getMessages(conversationId, cursor, limit);

    res.json({
      data: messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params as { conversationId: string };
    const { content } = req.body as CreateMessageBody;

    const { message, conversationMetadata } = await messagesService.createMessage(conversationId, userId, content);

    try {
      const { getIO } = await import("@/socket/socket.js");
      const { SOCKET_EVENTS } = await import("@/shared/socket-events.js");
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, message);
      if (conversationMetadata) {
        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, { conversation: conversationMetadata });
      }
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:new from HTTP endpoint", err);
    }

    res.status(201).json({
      data: message,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };
    const { content } = req.body as UpdateMessageBody;

    const { message, conversationMetadata } = await messagesService.editMessage(messageId, userId, content);

    try {
      const { getIO } = await import("@/socket/socket.js");
      const { SOCKET_EVENTS } = await import("@/shared/socket-events.js");
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_UPDATE, message);
      if (conversationMetadata) {
        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, { conversation: conversationMetadata });
      }
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:update from HTTP endpoint", err);
    }

    res.json({
      data: message,
    });
  } catch (error: any) {
    console.error("Error updating message:", error);
    if (error.message === "403 Forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (error.message === "Message not found." || error.message === "Cannot edit a deleted message.") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string };

    const { message, conversationMetadata } = await messagesService.deleteMessage(messageId, userId);

    try {
      const { getIO } = await import("@/socket/socket.js");
      const { SOCKET_EVENTS } = await import("@/shared/socket-events.js");
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETE, message);
      if (conversationMetadata) {
        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, { conversation: conversationMetadata });
      }
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:delete from HTTP endpoint", err);
    }

    res.json({
      data: message,
    });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    if (error.message === "403 Forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (error.message === "Message not found." || error.message === "Message is already deleted.") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
