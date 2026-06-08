import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as messagesService from "./messages.service.js";
import { getMessagesQuerySchema, type CreateMessageBody, type GetMessagesQuery } from "./messages.schema.js";

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

    const message = await messagesService.createMessage(conversationId, userId, content);

    res.status(201).json({
      data: message,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
