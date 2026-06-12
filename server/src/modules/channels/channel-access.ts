import { prisma } from "@/lib/db.js";
import { isWorkspaceMember } from "@/modules/auth/auth.service.js";

export type ChannelType = "DM" | "CHANNEL";
export type Visibility = "PUBLIC" | "PRIVATE" | null;

export interface ChannelAccessResult {
  allowed: boolean;
  type: ChannelType | null;
  visibility: Visibility;
  workspaceId: string | null;
}

/**
 * Verifies a user has access to a specific channel/conversation.
 *
 * Access rules:
 * - DM or Private Channel → must be a ConversationMember
 * - Public Channel → must be a WorkspaceMember
 *
 * Returns detailed info about the channel and access status.
 * Throws an Error with a descriptive message if access is denied or channel not found.
 */
export const verifyChannelAccess = async (
  userId: string,
  channelId: string
): Promise<ChannelAccessResult> => {
  if (!userId) throw new Error("userId is required");
  if (!channelId) throw new Error("channelId is required");

  const conversation = await prisma.conversation.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      visibility: true,
      workspaceId: true,
    },
  });

  if (!conversation) {
    throw new Error("Channel not found");
  }

  let allowed = false;

  if (conversation.type === "DM" || conversation.visibility === "PRIVATE") {
    // DM or Private Channel → must be a direct member
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: channelId, userId },
      },
    });
    allowed = !!membership;
  } else if (conversation.type === "CHANNEL" && conversation.visibility === "PUBLIC") {
    // Public Channel → must be a workspace member
    if (!conversation.workspaceId) {
      throw new Error("Public channel has no workspace association");
    }
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: conversation.workspaceId,
          userId,
        },
      },
    });
    allowed = !!workspaceMember;
  } else {
    throw new Error("Unknown conversation type");
  }

  if (!allowed) {
    throw new Error("Forbidden: You do not have access to this channel");
  }

  return {
    allowed: true,
    type: conversation.type,
    visibility: conversation.type === "DM" ? null : conversation.visibility,
    workspaceId: conversation.workspaceId,
  };
};

/**
 * Verifies a user is a member of a workspace.
 * Throws an Error if the user is not a member.
 * Delegates to the existing isWorkspaceMember to avoid duplicating the Prisma query.
 */
export const verifyWorkspaceMember = async (
  userId: string,
  workspaceId: string
): Promise<void> => {
  if (!userId) throw new Error("userId is required");
  if (!workspaceId) throw new Error("workspaceId is required");

  const member = await isWorkspaceMember(userId, workspaceId);
  if (!member) {
    throw new Error("Forbidden: You are not a member of this workspace");
  }
};
