import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as workspacesService from "./workspaces.service.js";
import * as usersRepo from "../users/users.repository.js";
import { dispatchConversationNew } from "@/socket/socket.dispatcher.js";
import { createAndDispatch } from "../notifications/notifications.service.js";

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

import { dispatchChannelUpdate, dispatchMemberUpdate } from "@/socket/socket.dispatcher.js";
import { WorkspaceRole } from "@prisma/client";

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
 * POST /workspaces/:id/invite
 * Invite a user to a workspace by username.
 * Creates an INVITE_RECEIVED notification for the target user.
 */
export const inviteMemberByUsername = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { username } = req.body as { username: string };

    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find the target user
    const targetUser = await usersRepo.findUserByUsername(username);
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

    // Create INVITE_RECEIVED notification for the target user
    await createAndDispatch({
      userId: targetUser.id,
      type: "INVITE_RECEIVED",
      title: "Workspace invite",
      body: `You've been invited to ${workspace.name}`,
      link: `/invite?workspace=${workspaceId}`,
      imageUrl: (workspace as any).imageUrl || undefined,
      metadata: {
        workspaceId,
        workspaceName: workspace.name,
        inviterId: userId,
        inviterName: currentUser?.username || "Unknown",
      },
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error inviting member by username:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
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
