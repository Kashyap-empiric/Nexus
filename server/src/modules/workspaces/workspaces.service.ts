import * as workspacesRepo from "./workspaces.repository.js";
import * as conversationsRepo from "../conversations/conversations.repository.js";
import { runTransaction } from "@/lib/transaction.js";
import { uuidv7 } from "uuidv7";
import { WorkspaceRole } from "@prisma/client";
import { isWorkspaceMember } from "@/shared/permissions.js";

export const getUserWorkspaces = async (userId: string) => {
  return workspacesRepo.findUserWorkspaces(userId);
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

  return conversationsRepo.findChannelByWorkspaceId(workspace.id);
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
export const createChannel = async (slugOrId: string, name: string, userId: string) => {
  console.log("createChannel called with:", { slugOrId, name, userId });
  const workspace = await workspacesRepo.findWorkspaceByIdOrSlug(slugOrId);
  if (!workspace) throw new Error("Workspace not found");
  console.log("Workspace found:", workspace.id, workspace.slug);

  const isMember = await isWorkspaceMember(userId, workspace.id);
  console.log("isMember check:", isMember, "for userId:", userId, "workspaceId:", workspace.id);
  if (!isMember) throw new Error("Forbidden: Not a member of this workspace");

  const channelId = uuidv7();
  
  // Add all workspace members to the new public channel
  const memberUserIds = workspace.members.map((m) => ({ userId: m.userId }));

  return workspacesRepo.createChannel({
    id: channelId,
    type: "CHANNEL",
    workspaceId: workspace.id,
    isPrivate: false,
    name,
    members: {
      create: memberUserIds,
    },
  });
};
