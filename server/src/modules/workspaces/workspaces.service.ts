import * as workspacesRepo from "./workspaces.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import { runTransaction } from "@/lib/transaction.js";
import { uuidv7 } from "uuidv7";
import { WorkspaceRole } from "@prisma/client";
import { isWorkspaceMember } from "@/shared/permissions.js";

export const getUserWorkspaces = async (userId: string) => {
  const workspaces = await workspacesRepo.findUserWorkspaces(userId);

  if (workspaces.length === 0) return workspaces;

  const workspaceIds = workspaces.map((w) => w.id);

  // Get all accessible channels across all user workspaces (includes workspaceId)
  const accessibleChannels = await conversationsRepo.findChannelIdsByWorkspaceIds(
    workspaceIds,
    userId
  );

  if (accessibleChannels.length === 0) {
    return workspaces.map((w) => ({ ...w, unreadCount: 0 }));
  }

  // Count unread messages per channel
  const unreadCountsMap = await conversationsRepo.countUnreadByConversations(
    userId,
    accessibleChannels.map((c) => c.id)
  );

  // Aggregate by workspace using the workspaceId from the channel fetch
  const workspaceUnreadTotals = new Map<string, number>();
  for (const channel of accessibleChannels) {
    if (channel.workspaceId) {
      const unread = unreadCountsMap.get(channel.id) || 0;
      workspaceUnreadTotals.set(
        channel.workspaceId,
        (workspaceUnreadTotals.get(channel.workspaceId) || 0) + unread
      );
    }
  }

  return workspaces.map((w) => ({
    ...w,
    unreadCount: workspaceUnreadTotals.get(w.id) || 0,
  }));
};

export const getWorkspaceDetails = async (userId: string, slugOrId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const isMember = await isWorkspaceMember(userId, workspace.id);
  if (!isMember) throw new Error("Forbidden: Not a member of this workspace");

  return workspace;
};

export const getWorkspaceChannels = async (userId: string, slugOrId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const isMember = await isWorkspaceMember(userId, workspace.id);
  if (!isMember) throw new Error("Forbidden: Not a member of this workspace");

  const channels = await conversationsRepo.findChannelByWorkspaceId(workspace.id, userId);

  // Count unread messages for all channels in a single query
  const unreadCountsMap = await conversationsRepo.countUnreadByConversations(
    userId,
    channels.map((c) => c.id)
  );

  return channels.map((channel) => ({
    ...channel,
    unreadCount: unreadCountsMap.get(channel.id) || 0,
  }));
};

export const createWorkspace = async (userId: string, name: string, slug: string, imageUrl?: string) => {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Invalid slug format");
  }

  return runTransaction(async (tx) => {
    const workspaceId = uuidv7();
    const generalChannelId = uuidv7();

    const workspace = await workspacesRepo.createWorkspaceInTransaction(tx, {
      id: workspaceId,
      name,
      slug,
      imageUrl,
      ownerId: userId,
      members: {
        create: { userId, role: WorkspaceRole.OWNER },
      },
    });

    await workspacesRepo.createChannelInTransaction(tx, {
      id: generalChannelId,
      type: "CHANNEL",
      workspaceId,
      isPrivate: false,
      visibility: "PUBLIC",
      createdBy: userId,
      name: "general",
      members: {
        create: [{ userId }],
      },
    });

    return workspace;
  });
};

/**
 * Schema Invariant: Workspace Channels must ALWAYS have a valid workspaceId.
 */
export const createChannel = async (slugOrId: string, name: string, visibility: "PUBLIC" | "PRIVATE", userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const isMember = await isWorkspaceMember(userId, workspace.id);
  if (!isMember) throw new Error("Forbidden: Not a member of this workspace");

  const channelId = uuidv7();
  
  // If public, all workspace members are added.
  // If private, only the creator is added initially.
  const memberUserIds = visibility === "PUBLIC" 
    ? workspace.members.map((m) => ({ userId: m.userId }))
    : [{ userId }];

  return workspacesRepo.createChannel({
    id: channelId,
    type: "CHANNEL",
    workspaceId: workspace.id,
    isPrivate: visibility === "PRIVATE",
    visibility,
    createdBy: userId,
    name,
    members: {
      create: memberUserIds,
    },
  });
};

export const updateChannel = async (slugOrId: string, channelId: string, data: { name?: string; visibility?: "PUBLIC" | "PRIVATE" }, userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) throw new Error("Forbidden: Not a member of this workspace");

  // Any workspace member can update a channel name


  if (data.visibility && member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN) {
    throw new Error("Forbidden: Only owners and admins can change channel visibility");
  }

  const channel = workspace.channels.find(c => c.id === channelId);
  if (!channel) throw new Error("Channel not found in this workspace");

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.visibility) {
    updateData.visibility = data.visibility;
    updateData.isPrivate = data.visibility === "PRIVATE";
  }

  return workspacesRepo.updateChannel(channelId, updateData);
};

export const deleteChannel = async (slugOrId: string, channelId: string, userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) throw new Error("Forbidden: Not a member of this workspace");

  if (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN) {
    throw new Error("Forbidden: Only owners and admins can delete channels");
  }

  const channel = workspace.channels.find(c => c.id === channelId);
  if (!channel) throw new Error("Channel not found in this workspace");

  if (channel.name === "general") {
    throw new Error("Forbidden: The general channel cannot be deleted");
  }

  return workspacesRepo.deleteConversation(channelId);
};

export const getWorkspaceMembers = async (slugOrId: string, userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const isMember = workspace.members.some(m => m.userId === userId);
  if (!isMember) throw new Error("Forbidden: Not a member of this workspace");

  return workspace.members;
};

export const updateMemberRole = async (slugOrId: string, memberUserId: string, role: WorkspaceRole, userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const currentUserMember = workspace.members.find(m => m.userId === userId);
  if (!currentUserMember || currentUserMember.role !== WorkspaceRole.OWNER) {
    throw new Error("Forbidden: Only workspace owners can manage roles");
  }

  if (memberUserId === userId) {
    throw new Error("Forbidden: Owners cannot change their own role");
  }

  const targetMember = workspace.members.find(m => m.userId === memberUserId);
  if (!targetMember) throw new Error("Member not found in this workspace");

  return workspacesRepo.updateWorkspaceMemberRole(workspace.id, memberUserId, role);
};

export const removeMember = async (slugOrId: string, memberUserId: string, userId: string) => {
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");

  const currentUserMember = workspace.members.find(m => m.userId === userId);
  if (!currentUserMember) throw new Error("Forbidden: Not a member of this workspace");

  // Cannot remove yourself
  if (memberUserId === userId) {
    throw new Error("Forbidden: Cannot remove yourself from the workspace");
  }

  const targetMember = workspace.members.find(m => m.userId === memberUserId);
  if (!targetMember) throw new Error("Member not found in this workspace");

  // Cannot remove the workspace owner
  if (targetMember.role === WorkspaceRole.OWNER) {
    throw new Error("Forbidden: Cannot remove the workspace owner");
  }

  // Permission checks
  const canRemove =
    currentUserMember.role === WorkspaceRole.OWNER ||
    (currentUserMember.role === WorkspaceRole.ADMIN && targetMember.role === WorkspaceRole.MEMBER);

  if (!canRemove) {
    throw new Error("Forbidden: You don't have permission to remove this member");
  }

  await workspacesRepo.removeWorkspaceMember(workspace.id, memberUserId);

  return { workspaceId: workspace.id, userId: memberUserId };
};
