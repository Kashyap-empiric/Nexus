import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as conversationsService from "./conversations.service.js";
import type { CreateConversationInput } from "./conversations.schema.js";

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversations = await conversationsService.getUserConversations(userId);
    res.json({ data: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversationDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const conversation = await conversationsService.getConversationById(id);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.body as CreateConversationInput;
    if (userId === targetUserId) {
      res.status(400).json({ error: "Cannot create a DM with yourself" });
      return;
    }

    const result = await conversationsService.createOrGetDM(userId, targetUserId);

    res.status(result.created ? 201 : 200).json({ data: result.conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
