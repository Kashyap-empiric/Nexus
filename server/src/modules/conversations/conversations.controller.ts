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

    // If a new conversation was created, dynamically join participants' sockets and notify them
    if (result.created) {
      try {
        const { getIO } = await import("@/socket/socket.js");
        const { SOCKET_EVENTS } = await import("@/shared/socket-events.js");
        const io = getIO();

        // Dynamically join each participant's active sockets to the new conversation room
        // NOTE: We iterate io.sockets.sockets (Map of real Socket instances) because
        // io.in(room).fetchSockets() returns RemoteSocket[] which lacks .join().
        // This is local-only; in multi-instance deployments, this only affects sockets
        // on the current process.
        for (const member of result.conversation.members) {
          for (const socket of io.sockets.sockets.values()) {
            if (socket.rooms.has(`user:${member.userId}`)) {
              await socket.join(`conversation:${result.conversation.id}`);
            }
          }
        }

        // Notify each participant about the new conversation
        for (const member of result.conversation.members) {
          io.to(`user:${member.userId}`).emit(SOCKET_EVENTS.CONVERSATION_NEW, result.conversation);
        }
      } catch (err) {
        console.error("[Socket.io] Failed to apply dynamic room join for new conversation:", err);
      }
    }

    res.status(result.created ? 201 : 200).json({ data: result.conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markConversationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params as { id: string };
    const { messageId } = req.body as { messageId: string };

    const { getMessageById } = await import("../messages/messages.service.js");
    const message = await getMessageById(messageId);

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (message.conversationId !== conversationId) {
      res.status(400).json({ error: "Message does not belong to this conversation" });
      return;
    }

    await conversationsService.updateLastReadMessage(conversationId, userId, messageId);

    try {
      const { getIO } = await import("@/socket/socket.js");
      const { SOCKET_EVENTS } = await import("@/shared/socket-events.js");
      const io = getIO();
      
      const payload = {
        conversationId,
        userId,
        lastReadMessageId: messageId,
      };
      
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, payload);
    } catch (err) {
      console.error("[Socket.io] Failed to emit message:read from HTTP endpoint", err);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
