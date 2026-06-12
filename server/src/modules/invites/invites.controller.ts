import { type Response } from "express";
import { type AuthRequest } from "../../types/shared.js";
import { resolveInviteService, generateInviteService } from "./invites.service.js";
import { dispatchConversationNew } from "../../socket/socket.dispatcher.js";
import { getIO } from "../../socket/socket.js";

export const resolveInvite = async (req: AuthRequest, res: Response): Promise<any> => {
  const { token } = req.body;
  const userId = req.user?.id;

  if (!token || !userId) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const { redirectUrl, events } = await resolveInviteService({ token, userId });

    // STEP 3 — POST-COMMIT SOCKET EMISSION (Domain Event Dispatching)
    if (events && events.length > 0) {
      try {
        events.forEach((event) => {
          if (event.type === "CONVERSATION_UPDATE" && event.conversationId) {
            dispatchConversationUpdate(event.conversationId, event.userId || userId);
          } else if (event.type === "CONVERSATION_NEW" && event.payload) {
            dispatchConversationNew(event.payload);
          }
        });
      } catch (ioError) {
        console.error("[resolveInvite] Failed to emit socket event:", ioError);
      }
    }

    res.json({ redirectUrl });
  } catch (error: any) {
    if (error.message === "INVALID_OR_EXPIRED_INVITE") {
      return res.status(400).json({ error: "INVALID_OR_EXPIRED_INVITE" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

function dispatchConversationUpdate(conversationId: string, userId: string) {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit("CONVERSATION_UPDATE", {
      conversationId,
      type: "MEMBER_JOINED",
      userId,
      conversation: {
        id: conversationId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("[resolveInvite] Failed to emit CONVERSATION_UPDATE:", err);
  }
}

export const generateInvite = async (req: AuthRequest, res: Response): Promise<any> => {
  const { type, entityId } = req.body;
  const userId = req.user?.id;

  if (!type || !userId) {
    return res.status(400).json({ error: "Missing type" });
  }

  try {
    const result = await generateInviteService({ type, entityId, userId });
    return res.json(result);
  } catch (error: any) {
    if (error.message === "CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Not authorized to generate invite for this entity" });
    }
    if (error.message === "ENTITY_ID_REQUIRED") {
      return res.status(400).json({ error: "Entity ID is required for this invite type" });
    }
    console.error("[generateInvite] error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
