import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { AppError } from "@/lib/app-error.js";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/app-error.js";
import { ENV } from "@/config/env.js";
import * as workspacesService from "./workspaces.service.js";
import * as workspacesRepo from "./workspaces.repository.js";
import * as usersRepo from "../users/users.repository.js";
import { dispatchConversationNew } from "@/socket/socket.dispatcher.js";
import { createAndDispatch } from "../notifications/notifications.service.js";
import { generateInviteService, revokeInviteByToken } from "../invites/invites.service.js";
import { sendWorkspaceInviteEmail } from "../../lib/email.js";
import { emailQueue, notificationQueue } from "../../jobs/queues.js";
import type { BatchInviteJob, SendWorkspaceInviteData } from "../../jobs/types.js";
import { findChannelIdsByWorkspaceId } from "../conversations/conversations.repository.js";
import { getIO } from "@/socket/socket.js";
import { dispatchChannelUpdate, dispatchMemberUpdate, dispatchChannelMemberUpdate, dispatchWorkspaceUpdate } from "@/socket/socket.dispatcher.js";
import { WorkspaceRole } from "@prisma/client";
import { addChannelMembersSchema } from "./workspaces.schema.js";

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

export const getWorkspaceDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const channels = await workspacesService.getWorkspaceChannels(userId, workspaceId);

    res.json({ data: { workspace, channels } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching workspace details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceChannels = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const channels = await workspacesService.getWorkspaceChannels(userId, workspaceId);

    res.json({ data: channels });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching workspace channels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { name, slug, imageUrl, iconPath, description } = req.body as { name?: string; slug?: string; imageUrl?: string; iconPath?: string; description?: string };

    const workspace = await workspacesService.updateWorkspace(workspaceId, { name, slug, imageUrl, iconPath, description }, userId);
    
    dispatchWorkspaceUpdate(workspaceId, { action: "UPDATED", workspace });

    res.json({ data: workspace });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error updating workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const memberUserIds = workspace.members.map(m => m.userId);
    const workspaceName = workspace.name;

    await workspacesService.deleteWorkspace(workspaceId, userId);

    dispatchWorkspaceUpdate(workspace.id, {
      action: "DELETED",
      workspace: { id: workspace.id, name: workspaceName },
      memberUserIds,
    });

    try {
      const io = getIO();
      const channels = workspace.channels || [];
      for (const memberUserId of memberUserIds) {
        const memberSockets = await io.in(`user:${memberUserId}`).fetchSockets();
        for (const socket of memberSockets) {
          for (const channel of channels) {
            socket.leave(`conversation:${channel.id}`);
          }
        }
      }
    } catch (socketErr) {
      console.error("[Socket.io] Failed to leave rooms on workspace deletion:", socketErr);
    }

    try {
      const currentUser = await usersRepo.findUserById(userId);
      const otherUserIds = memberUserIds.filter((id) => id !== userId);

      if (notificationQueue && otherUserIds.length > 0) {
        await notificationQueue.add("fan-out-notification", {
          type: "WORKSPACE_DELETED",
          userIds: otherUserIds,
          template: {
            title: "Workspace deleted",
            body: `${workspaceName} was deleted by ${currentUser?.username || "the workspace owner"}`,
            link: "/",
            metadata: {
              workspaceId: workspace.id,
              workspaceName,
              deletedBy: userId,
              deletedByUsername: currentUser?.username,
            },
          },
        });
      }
    } catch (notifError) {
      console.error("[Notifications] Failed to create WORKSPACE_DELETED notifications:", notifError);
    }

    res.json({ data: { id: workspaceId } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error deleting workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const result = await workspacesService.leaveWorkspace(workspaceId, userId);

    try {
      const io = getIO();
      const channels = await findChannelIdsByWorkspaceId(workspaceId);
      const userSockets = await io.in(`user:${userId}`).fetchSockets();
      for (const socket of userSockets) {
        for (const channel of channels) {
          socket.leave(`conversation:${channel.id}`);
        }
      }
    } catch (socketErr) {
      console.error("[Socket.io] Failed to leave rooms on workspace leave:", socketErr);
    }

    res.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error leaving workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createWorkspace = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, slug, imageUrl, description, iconPath } = req.body as { name: string; slug: string; imageUrl?: string; description?: string; iconPath?: string };

    const workspace = await workspacesService.createWorkspace(userId, name, slug, imageUrl, description, iconPath);
    res.status(201).json({ data: workspace });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof Error && "code" in error && (error as Record<string, unknown>).code === "P2002") {
      res.status(409).json({ error: "Slug already taken. Please choose a different slug." });
      return;
    }
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createChannel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { name, visibility } = req.body as { name: string; visibility: "PUBLIC" | "PRIVATE" };

    const channel = await workspacesService.createChannel(workspaceId, name, visibility, userId);
    
    dispatchConversationNew(channel as any);

    try {
      if (channel && channel.members && notificationQueue) {
        const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
        const workspaceName = workspace.name;
        const otherUserIds = channel.members
          .map((m: any) => m.userId)
          .filter((id: string) => id !== userId);

        if (otherUserIds.length > 0) {
          await notificationQueue.add("fan-out-notification", {
            type: "CHANNEL_CREATED",
            userIds: otherUserIds,
            template: {
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
            },
          });
        }
      }
    } catch (err) {
      console.error("[Notifications] Failed to create CHANNEL_CREATED notifications:", err);
    }

    res.status(201).json({ data: channel });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateChannel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };
    const { name, description, visibility } = req.body as { name?: string; description?: string; visibility?: "PUBLIC" | "PRIVATE" };

    const channel = await workspacesService.updateChannel(workspaceId, channelId, { name, description, visibility }, userId);
    
    dispatchChannelUpdate(workspaceId, { action: "UPDATED", channel });

    res.json({ data: channel });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error updating channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteChannel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };

    await workspacesService.deleteChannel(workspaceId, channelId, userId);
    
    dispatchChannelUpdate(workspaceId, { action: "DELETED", channel: { id: channelId } });

    res.json({ data: { id: channelId } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error deleting channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


async function sendWorkspaceInvite(
  workspaceId: string,
  targetUserId: string,
  inviterId: string,
  workspaceName: string,
  inviterName: string,
  workspaceImageUrl?: string,
) {
  const invite = await generateInviteService({
    type: "WORKSPACE",
    entityId: workspaceId,
    userId: inviterId,
    forceNew: true,
  });

  createAndDispatch({
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
      token: invite.token,
    },
  }).catch((err) => console.error(`[sendWorkspaceInvite] Failed to dispatch INVITE_RECEIVED for ${targetUserId}:`, err));

  try {
    const targetUser = await usersRepo.findUserById(targetUserId);
    if (targetUser?.email) {
      const baseUrl = ENV.CLIENT_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite?token=${invite.token}`;

      if (emailQueue) {
        const jobData: SendWorkspaceInviteData = {
          type: "workspace_invite",
          to: targetUser.email,
          inviteToken: invite.token,
          workspaceName,
          inviterName,
          inviteUrl,
        expiresAt: invite.expiresAt || null,
        };
        await emailQueue.add("send-email", jobData);
      } else {
        await sendWorkspaceInviteEmail({
          to: targetUser.email,
          workspaceName,
          inviterName,
          inviteUrl,
          expiresAt: invite.expiresAt ? new Date(invite.expiresAt) : null,
        });
      }
    }
  } catch (emailErr) {
    console.error(`[sendWorkspaceInvite] Email failed for ${targetUserId}:`, emailErr);
  }
}


export const inviteMemberByUsername = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const isAlreadyMember = workspace.members.some((m: any) => m.userId === targetUser.id);
    if (isAlreadyMember) {
      res.status(400).json({ error: "User is already a member of this workspace" });
      return;
    }

    const currentUser = await usersRepo.findUserById(userId);

    await sendWorkspaceInvite(
      workspaceId,
      targetUser.id,
      userId,
      workspace.name,
      currentUser?.username || "Unknown",
      (workspace as any).imageUrl,
    );

    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error inviting member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const inviteMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Pre-filter skipped users (self-invite, already members) synchronously
    const memberUserIds = new Set(workspace.members.map((m: any) => m.userId));
    const validUserIds: string[] = [];
    const skipped: { userId: string; reason: string }[] = [];

    for (const targetUserId of userIds) {
      if (targetUserId === userId) {
        skipped.push({ userId: targetUserId, reason: "Cannot invite yourself" });
      } else if (memberUserIds.has(targetUserId)) {
        skipped.push({ userId: targetUserId, reason: "Already a member" });
      } else {
        validUserIds.push(targetUserId);
      }
    }

    if (validUserIds.length === 0) {
      res.status(200).json({
        success: true,
        invited: [],
        skipped,
      });
      return;
    }

    // Enqueue a batch-invite job for async processing
    if (notificationQueue) {
      const jobData: BatchInviteJob = {
        workspaceId,
        inviterId: userId,
        inviterName,
        workspaceName: workspace.name,
        workspaceImageUrl,
        userIds: validUserIds,
      };
      await notificationQueue.add("batch-invite", jobData);
    } else {
      // Fallback: process synchronously when Redis is unavailable
      for (const targetUserId of validUserIds) {
        try {
          await sendWorkspaceInvite(
            workspaceId,
            targetUserId,
            userId,
            workspace.name,
            inviterName,
            workspaceImageUrl,
          );
        } catch (err: any) {
          console.error(`[inviteMembers] Fallback failed for user ${targetUserId}:`, err);
          skipped.push({ userId: targetUserId, reason: err.message || "Failed to send invite" });
        }
      }
    }

    res.status(200).json({
      success: true,
      queued: !!notificationQueue,
      total: userIds.length,
      invitedCount: validUserIds.length,
      skipped,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error inviting members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const inviteByEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { email } = req.body as { email: string };

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);

    const currentUser = await usersRepo.findUserById(userId);
    const inviterName = currentUser?.username || "A workspace member";

    let existingUser = null;
    try {
      existingUser = await usersRepo.findUserByEmail(email);
    } catch {
    }
    if (existingUser) {
      const isAlreadyMember = workspace.members.some((m: any) => m.userId === existingUser.id);
      if (isAlreadyMember) {
        res.status(400).json({ error: "User is already a member of this workspace" });
        return;
      }
    }

    const invite = await generateInviteService({
      type: "WORKSPACE",
      entityId: workspaceId,
      userId,
      forceNew: true,
    });

    const baseUrl = ENV.CLIENT_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}${invite.invitePath}`;

    let emailSent = false;

    if (emailQueue) {
      const jobData: SendWorkspaceInviteData = {
        type: "workspace_invite",
        to: email,
        inviteToken: invite.token,
        workspaceName: workspace.name,
        inviterName,
        inviteUrl,
        expiresAt: invite.expiresAt || null,
      };
      await emailQueue.add("send-email", jobData);
      emailSent = true;

      if (!existingUser) {
        const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const delay = expiresAt.getTime() - Date.now();

        await notificationQueue!.add(
          "revoke-invite",
          { inviteToken: invite.token },
          {
            delay: Math.max(delay, 0),
            jobId: `revoke-invite:${invite.token}`,
          },
        );
      }
    } else {
      try {
        await sendWorkspaceInviteEmail({
          to: email,
          workspaceName: workspace.name,
          inviterName,
          inviteUrl,
          expiresAt: invite.expiresAt ? new Date(invite.expiresAt) : null,
        });
        emailSent = true;
      } catch (emailErr) {
        const message =
          emailErr instanceof Error ? emailErr.message : "EMAIL_SEND_FAILED";

        if (!existingUser) {
          console.error(
            `[inviteByEmail] ✗ Revoking invite  to=${email}  reason=${message}`,
          );

          await revokeInviteByToken(invite.token).catch((revokeErr) =>
            console.error("[inviteByEmail] Failed to revoke orphan invite:", revokeErr)
          );

          if (message === "EMAIL_NOT_CONFIGURED") {
            res.status(500).json({
              success: false,
              emailSent: false,
              error: "Email service is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.",
            });
            return;
          }

          res.status(500).json({
            success: false,
            emailSent: false,
            error: "Unable to deliver invitation email. Please check the email address and try again.",
          });
          return;
        }

        console.error(`[inviteByEmail] ✗ Email failed  to=${email}  reason=${message}  notificationSent=true`);
      }
    }

    if (existingUser) {
      createAndDispatch({
        userId: existingUser.id,
        type: "INVITE_RECEIVED",
        title: "Workspace invite",
        body: `You've been invited to ${workspace.name} by ${inviterName}`,
        link: invite.invitePath,
        imageUrl: (workspace as any).imageUrl || undefined,
        metadata: {
          workspaceId,
          workspaceName: workspace.name,
          inviterId: userId,
          inviterName,
          token: invite.token,
        },
      }).catch((err) => console.error("[inviteByEmail] Failed to send in-app notification:", err));
    }

    console.log(
      `[inviteByEmail] ✓ Complete  to=${email}  emailSent=${emailSent}  workspace=${workspace.name}`,
    );

    res.status(200).json({
      success: true,
      invited: email,
      emailSent,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error inviting by email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChannelMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId } = req.params as { id: string; channelId: string };

    const members = await workspacesService.getChannelMembers(workspaceId, channelId, userId);

    res.json({ data: members });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching channel members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addChannelMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    try {
      if (result.addedUsers && result.addedUsers.length > 0 && notificationQueue) {
        const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
        const currentUser = await usersRepo.findUserById(userId);
        const channel = await workspacesService.getWorkspaceChannels(userId, workspaceId).then(channels => channels.find(c => c.id === channelId));
        const otherUserIds = result.addedUsers
          .map((u: any) => u.id)
          .filter((id: string) => id !== userId);

        if (otherUserIds.length > 0) {
          await notificationQueue.add("fan-out-notification", {
            type: "CHANNEL_MEMBER_ADDED",
            userIds: otherUserIds,
            template: {
              title: "Added to channel",
              body: `You were added to #${channel?.name || "a channel"} in ${workspace.name} by ${currentUser?.username || "a member"}`,
              link: `/workspaces/${workspaceId}/channels/${channelId}`,
              metadata: {
                channelId,
                channelName: channel?.name,
                workspaceId,
                workspaceName: workspace.name,
                addedBy: userId,
                addedByUsername: currentUser?.username,
              },
            },
          });
        }
      }
    } catch (err) {
      console.error("[Notifications] Failed to create CHANNEL_MEMBER_ADDED notifications:", err);
    }

    res.status(201).json({ data: { added: result.added } });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error adding channel members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeChannelMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, channelId, userId: targetUserId } = req.params as { id: string; channelId: string; userId: string };

    const result = await workspacesService.removeMemberFromChannel(workspaceId, channelId, userId, targetUserId);

    dispatchChannelMemberUpdate(workspaceId, channelId, "REMOVED", { removedUserId: targetUserId });

    const currentUser = await usersRepo.findUserById(userId);
    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const channels = await workspacesService.getWorkspaceChannels(userId, workspaceId);
    const channel = channels.find(c => c.id === channelId);

    createAndDispatch({
      userId: targetUserId,
      type: "CHANNEL_MEMBER_REMOVED",
      title: "Removed from channel",
      body: `You were removed from #${channel?.name || channelId} in ${workspace.name} by ${currentUser?.username || "a member"}`,
      link: `/workspaces/${workspaceId}/channels`,
      metadata: {
        workspaceId,
        channelId,
        channelName: channel?.name,
        workspaceName: workspace.name,
        removedBy: userId,
        removedByUsername: currentUser?.username,
      },
    }).catch((err) => console.error("[Notifications] Failed to create CHANNEL_MEMBER_REMOVED notification:", err));

    res.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error removing channel member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const members = await workspacesService.getWorkspaceMembers(workspaceId, userId);

    res.json({ data: members });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error fetching workspace members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, userId: memberUserId } = req.params as { id: string; userId: string };
    const { role } = req.body as { role: WorkspaceRole };

    const updatedMember = await workspacesService.updateMemberRole(workspaceId, memberUserId, role, userId);
    
    dispatchMemberUpdate(workspaceId, { action: "ROLE_UPDATED", member: updatedMember });

    const currentUser = await usersRepo.findUserById(userId);
    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);

    createAndDispatch({
      userId: memberUserId,
      type: "ROLE_CHANGED",
      title: "Role changed",
      body: `Your role in ${workspace.name} has been changed to ${role}`,
      link: `/workspaces/${workspaceId}/channels`,
      metadata: {
        workspaceId,
        workspaceName: workspace.name,
        changedBy: userId,
        changedByUsername: currentUser?.username,
        newRole: role,
      },
    }).catch((err) => console.error("[Notifications] Failed to create ROLE_CHANGED notification:", err));

    res.json({ data: updatedMember });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeWorkspaceMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, userId: memberUserId } = req.params as { id: string; userId: string };

    const result = await workspacesService.removeMember(workspaceId, memberUserId, userId);
    
    dispatchMemberUpdate(workspaceId, { action: "REMOVED", member: { userId: memberUserId } });

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

    const currentUser = await usersRepo.findUserById(userId);
    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);

    createAndDispatch({
      userId: memberUserId,
      type: "MEMBER_REMOVED",
      title: "Removed from workspace",
      body: `You have been removed from ${workspace.name} by ${currentUser?.username || "a workspace admin"}`,
      metadata: {
        workspaceId,
        workspaceName: workspace.name,
        removedBy: userId,
        removedByUsername: currentUser?.username,
      },
    }).catch((err) => console.error("[Notifications] Failed to create MEMBER_REMOVED notification:", err));

    res.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    console.error("Error removing workspace member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
