import { type Response, type NextFunction } from "express";
import { type Request } from "express";
import { type AuthRequest } from "../../types/shared.js";
import { AppError } from "@/lib/app-error.js";
import { createAndDispatch } from "../notifications/notifications.service.js";
import { resolveInviteService, generateInviteService, getInviteInfoService, revokeInviteByToken } from "./invites.service.js";
import { dispatchConversationNew, dispatchMemberUpdate } from "../../socket/socket.dispatcher.js";
import { getIO } from "../../socket/socket.js";
import { SOCKET_EVENTS } from "../../shared/socket-events.js";
import { prisma } from "@/lib/db.js";

export const resolveInvite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  const { token } = req.body;
  const userId = req.user?.id;

  if (!token || !userId) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const { redirectUrl, events, alreadyMember } = await resolveInviteService({ token, userId });
    if (events && events.length > 0) {
      try {
        events.forEach((event) => {
          if (event.type === "CONVERSATION_UPDATE" && event.conversationId) {
            dispatchConversationUpdate(event.conversationId, event.userId || userId);
          } else if (event.type === "CONVERSATION_NEW" && event.payload) {
            dispatchConversationNew(event.payload);
          } else if (event.type === "WORKSPACE_MEMBER_UPDATE" && event.workspaceId && event.member) {
            dispatchMemberUpdate(event.workspaceId, { action: "ADDED", member: event.member });
          }
        });

        const workspaceEvent = events.find(e => e.type === "WORKSPACE_MEMBER_UPDATE");
        if (workspaceEvent?.workspaceId) {
          const wsId = workspaceEvent.workspaceId;
          const redirectParts = redirectUrl.match(/\/workspaces\/[^/]+\/channels\/([^/]+)/);
          const channelId = redirectParts?.[1];

          try {
            const io = getIO();
            const sockets = await io.in(`user:${userId}`).fetchSockets();
            for (const socket of sockets) {
              await socket.join(`workspace:${wsId}`);
              if (channelId) {
                await socket.join(`conversation:${channelId}`);
              }
            }
          } catch (joinError) {
            console.error("[resolveInvite] Failed to dynamically join socket rooms:", joinError);
          }
        }
      } catch (ioError) {
        console.error("[resolveInvite] Failed to emit socket event:", ioError);
      }
    }

    res.json({ redirectUrl, alreadyMember: alreadyMember || undefined });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("[resolveInvite] error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function dispatchConversationUpdate(conversationId: string, userId: string) {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, {
      conversationId,
      type: "MEMBER_JOINED",
      userId,
      conversation: {
        id: conversationId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("[resolveInvite] Failed to emit conversation:update:", err);
  }
}

export const declineInvite = async (req: AuthRequest, res: Response): Promise<any> => {
  const { token } = req.body;
  const userId = req.user?.id;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const invite = await revokeInviteByToken(token);

    if (!invite) {
      return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    }

    if (invite.createdBy && invite.createdBy !== userId) {
      const decliner = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { username: true } }) : null;
      let entityName = "a workspace";
      if (invite.type === "WORKSPACE") {
        const workspace = await prisma.workspace.findUnique({ where: { id: invite.entityId }, select: { name: true } });
        entityName = workspace?.name || "a workspace";
      }

      createAndDispatch({
        userId: invite.createdBy,
        type: "INVITE_DECLINED",
        title: "Invite declined",
        body: `${decliner?.username || "Someone"} declined your invite to ${entityName}`,
        metadata: { token, entityId: invite.entityId },
      }).catch(err => console.error("[declineInvite] Failed to dispatch INVITE_DECLINED:", err));
    }

    console.log(`[declineInvite] ✓ Invite declined  token=${token.substring(0, 8)}...  userId=${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[declineInvite] error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getInviteInfo = async (req: Request, res: Response): Promise<any> => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const info = await getInviteInfoService(token);
    if (!info) {
      return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    }
    return res.json({ data: info });
  } catch (error) {
    console.error("[getInviteInfo] error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const generateInvite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  const { type, entityId } = req.body;
  const userId = req.user?.id;

  if (!type || !userId) {
    return res.status(400).json({ error: "Missing type" });
  }

  try {
    const result = await generateInviteService({ type, entityId, userId });
    return res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("[generateInvite] error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
