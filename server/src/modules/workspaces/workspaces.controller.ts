import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as workspacesService from "./workspaces.service.js";
import * as usersRepo from "../users/users.repository.js";
import { dispatchConversationNew } from "@/socket/socket.dispatcher.js";
import { createAndDispatch } from "../notifications/notifications.service.js";
import { generateInviteService } from "../invites/invites.service.js";
import { findChannelIdsByWorkspaceId } from "../conversations/conversations.repository.js";
import { getIO } from "@/socket/socket.js";

export const getUserWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const workspaces = await workspacesService.getUserWorkspaces(userId);
    res.json({ data: workspaces });
  } catch (error) {
    console.error("Error fetching user workspaces:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const channels = await workspacesService.getWorkspaceChannels(userId, workspaceId);

    res.json({ data: { workspace, channels } });
  } catch (error: any) {
    console.error("Error fetching workspace details:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const channels = await workspacesService.getWorkspaceChannels(userId, workspaceId);

    res.json({ data: channels });
  } catch (error: any) {
    console.error("Error fetching workspace channels:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, slug, imageUrl } = req.body as { name: string; slug: string; imageUrl?: string };

    const workspace = await workspacesService.createWorkspace(userId, name, slug, imageUrl);
    res.status(201).json({ data: workspace });
  } catch (error) {
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { name, visibility } = req.body as { name: string; visibility: "PUBLIC" | "PRIVATE" };

    const channel = await workspacesService.createChannel(workspaceId, name, visibility, userId);
    
    // Dispatch new conversation event for socket clients
    dispatchConversationNew(channel as any);

    // Create CHANNEL_CREATED notification for all workspace members except the creator
    try {
      if (channel && channel.members) {
        const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
        const workspaceName = workspace.name;
        
        for (const member of channel.members) {
          if (member.userId !== userId) {
            await createAndDispatch({
              userId: member.userId,
              type: "CHANNEL_CREATED",
              title: "New channel",
              body: `#${name} was created in ${workspaceName}`,
              link: `/workspaces/${workspaceId}/channels/${channel.id}`,
              metadata: {
                channelId: channel.id,
                channelName: name,
                workspaceId,
                workspaceName,
                creatorId: userId,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("[Notifications] Failed to create CHANNEL_CREATED notifications:", err);
    }

    res.status(201).json({ data: channel });
  } catch (error: any) {
    console.error("Error creating channel:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

import { dispatchChannelUpdate, dispatchMemberUpdate, dispatchChannelMemberUpdate } from "@/socket/socket.dispatcher.js";
import { WorkspaceRole } from "@prisma/client";
import { addChannelMembersSchema } from "./workspaces.schema.js";

export const updateChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };
    const { name, visibility } = req.body as { name?: string; visibility?: "PUBLIC" | "PRIVATE" };

    const channel = await workspacesService.updateChannel(workspaceId, channelId, { name, visibility }, userId);
    
    dispatchChannelUpdate(workspaceId, { action: "UPDATED", channel });

    res.json({ data: channel });
  } catch (error: any) {
    console.error("Error updating channel:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };

    await workspacesService.deleteChannel(workspaceId, channelId, userId);
    
    dispatchChannelUpdate(workspaceId, { action: "DELETED", channel: { id: channelId } });

    res.json({ data: { id: channelId } });
  } catch (error: any) {
    console.error("Error deleting channel:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Helper to send an invite to a single user.
 * Generates an invite token via the invite service and creates an INVITE_RECEIVED notification.
 */
async function sendWorkspaceInvite(
  workspaceId: string,
  targetUserId: string,
  inviterId: string,
  workspaceName: string,
  inviterName: string,
  workspaceImageUrl?: string,
) {
  // Generate a unique invite token per user (forceNew skips the 24h rotation policy
  // so each invited user gets their own unique token)
  const invite = await generateInviteService({
    type: "WORKSPACE",
    entityId: workspaceId,
    userId: inviterId,
    forceNew: true,
  });

  // Create INVITE_RECEIVED notification with the token in the link
  await createAndDispatch({
    userId: targetUserId,
    type: "INVITE_RECEIVED",
    title: "Workspace invite",
    body: `You've been invited to ${workspaceName} by ${inviterName}`,
    link: `/invite?token=${invite.token}`,
    imageUrl: workspaceImageUrl || undefined,
    metadata: {
      workspaceId,
      workspaceName,
      inviterId,
      inviterName,
    },
  });
}

/**
 * POST /workspaces/:id/invite
 * Invite a user to a workspace by username or email.
 * Creates an INVITE_RECEIVED notification for the target user with a proper invite token.
 */
export const inviteMemberByUsername = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { username, email } = req.body as { username?: string; email?: string };

    let targetUser;

    if (email && typeof email === "string") {
      targetUser = await usersRepo.findUserByEmail(email);
    } else if (username && typeof username === "string") {
      targetUser = await usersRepo.findUserByUsername(username);
    }

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (targetUser.id === userId) {
      res.status(400).json({ error: "Cannot invite yourself" });
      return;
    }

    // Check if already a member
    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const isAlreadyMember = workspace.members.some((m: any) => m.userId === targetUser.id);
    if (isAlreadyMember) {
      res.status(400).json({ error: "User is already a member of this workspace" });
      return;
    }

    // Get current user info for the notification
    const currentUser = await usersRepo.findUserById(userId);

    // Send invite with token-based flow
    await sendWorkspaceInvite(
      workspaceId,
      targetUser.id,
      userId,
      workspace.name,
      currentUser?.username || "Unknown",
      (workspace as any).imageUrl,
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error inviting member:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /workspaces/:id/invite-multiple
 * Batch invite multiple users to a workspace by their user IDs.
 * Each user gets a separate invite token and INVITE_RECEIVED notification.
 */
export const inviteMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { userIds } = req.body as { userIds: string[] };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: "userIds array is required" });
      return;
    }

    if (userIds.length > 50) {
      res.status(400).json({ error: "Cannot invite more than 50 users at once" });
      return;
    }

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const currentUser = await usersRepo.findUserById(userId);
    const inviterName = currentUser?.username || "Unknown";
    const workspaceImageUrl = (workspace as any).imageUrl;

    const invited: { userId: string }[] = [];
    const skipped: { userId: string; reason: string }[] = [];

    for (const targetUserId of userIds) {
      // Skip self
      if (targetUserId === userId) {
        skipped.push({ userId: targetUserId, reason: "Cannot invite yourself" });
        continue;
      }

      // Check if already a member
      const isAlreadyMember = workspace.members.some((m: any) => m.userId === targetUserId);
      if (isAlreadyMember) {
        skipped.push({ userId: targetUserId, reason: "Already a member" });
        continue;
      }

      try {
        await sendWorkspaceInvite(
          workspaceId,
          targetUserId,
          userId,
          workspace.name,
          inviterName,
          workspaceImageUrl,
        );
        invited.push({ userId: targetUserId });
      } catch (err: any) {
        console.error(`[inviteMembers] Failed to invite user ${targetUserId}:`, err);
        skipped.push({ userId: targetUserId, reason: err.message || "Failed to send invite" });
      }
    }

    res.status(200).json({
      success: true,
      invited,
      skipped,
    });
  } catch (error: any) {
    console.error("Error inviting members:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChannelMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };

    const members = await workspacesService.getChannelMembers(workspaceId, channelId, userId);

    res.json({ data: members });
  } catch (error: any) {
    console.error("Error fetching channel members:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error?.message?.startsWith("Bad Request")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addChannelMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };

    const parsed = addChannelMembersSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
      return;
    }

    const result = await workspacesService.addMembersToChannel(workspaceId, channelId, userId, parsed.data.userIds);

    dispatchChannelMemberUpdate(workspaceId, channelId, "ADDED", { addedMembers: result.addedUsers });

    res.status(201).json({ data: { added: result.added } });
  } catch (error: any) {
    console.error("Error adding channel members:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error?.message?.startsWith("Bad Request")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeChannelMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId, userId: targetUserId } = req.params as { id: string; channelId: string; userId: string };

    const result = await workspacesService.removeMemberFromChannel(workspaceId, channelId, userId, targetUserId);

    dispatchChannelMemberUpdate(workspaceId, channelId, "REMOVED", { removedUserId: targetUserId });

    res.json({ data: result });
  } catch (error: any) {
    console.error("Error removing channel member:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error?.message?.startsWith("Bad Request")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const members = await workspacesService.getWorkspaceMembers(workspaceId, userId);

    res.json({ data: members });
  } catch (error: any) {
    console.error("Error fetching workspace members:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, userId: memberUserId } = req.params as { id: string; userId: string };
    const { role } = req.body as { role: WorkspaceRole };

    const updatedMember = await workspacesService.updateMemberRole(workspaceId, memberUserId, role, userId);
    
    dispatchMemberUpdate(workspaceId, { action: "ROLE_UPDATED", member: updatedMember });

    res.json({ data: updatedMember });
  } catch (error: any) {
    console.error("Error updating member role:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeWorkspaceMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, userId: memberUserId } = req.params as { id: string; userId: string };

    const result = await workspacesService.removeMember(workspaceId, memberUserId, userId);
    
    // Dispatch to workspace room (all members see updated list)
    dispatchMemberUpdate(workspaceId, { action: "REMOVED", member: { userId: memberUserId } });

    // Leave the removed user's socket connections from all workspace channel rooms
    // This prevents privilege escalation where a removed user continues receiving messages (C10)
    try {
      const io = getIO();
      const channels = await findChannelIdsByWorkspaceId(workspaceId);
      const removedUserSockets = await io.in(`user:${memberUserId}`).fetchSockets();
      for (const socket of removedUserSockets) {
        for (const channel of channels) {
          socket.leave(`conversation:${channel.id}`);
        }
      }
    } catch (socketErr) {
      console.error("[Socket.io] Failed to leave rooms on workspace member removal:", socketErr);
    }

    // Create a MEMBER_REMOVED notification for the removed user
    try {
      const currentUser = await usersRepo.findUserById(userId);
      const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);

      await createAndDispatch({
        userId: memberUserId,
        type: "MEMBER_REMOVED",
        title: "Removed from workspace",
        body: `You have been removed from ${workspace.name} by ${currentUser?.username || "a workspace admin"}`,
        link: "/",
        metadata: {
          workspaceId,
          workspaceName: workspace.name,
          removedBy: userId,
          removedByUsername: currentUser?.username,
        },
      });
    } catch (notifError) {
      console.error("[Notifications] Failed to create MEMBER_REMOVED notification:", notifError);
    }

    res.json({ data: result });
  } catch (error: any) {
    console.error("Error removing workspace member:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
