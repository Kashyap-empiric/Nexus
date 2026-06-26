import { prisma } from "@/lib/db.js";
import type { Prisma } from "@prisma/client";

export const searchUsers = async (query: string, currentUserId: string) => {
  return await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        {
          id: { not: currentUserId },
        },
      ],
      isDeleting: false,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      avatarPath: true,
    },
    take: 10,
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

export const findPublicProfileById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      avatarPath: true,
      bio: true,
      status: true,
      statusText: true,
      createdAt: true,
    }
  });
};

export const updateUser = async (
  id: string,
  data: {
    username?: string;
    fullName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    avatarPath?: string | null;
    status?: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE";
    statusText?: string | null;
    isOnboarded?: boolean;
  }
) => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

export const findUserByUsername = async (username: string) => {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      avatarPath: true,
    },
  });
};

export const setUserDeleting = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { isDeleting: true },
  });
};

export const findOwnedWorkspaceIds = async (userId: string): Promise<string[]> => {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  return workspaces.map(w => w.id);
};

export const markWorkspacesDeleting = async (workspaceIds: string[]) => {
  if (workspaceIds.length === 0) return;
  await prisma.workspace.updateMany({
    where: { id: { in: workspaceIds } },
    data: { isDeleting: true },
  });
};

export const deleteAccountCleanup = async (tx: Prisma.TransactionClient, userId: string, ownedWorkspaceIds: string[]) => {
  await tx.notification.deleteMany({ where: { userId } });
  await tx.conversationMember.deleteMany({ where: { userId } });
  await tx.invite.deleteMany({ where: { createdBy: userId } });
  await tx.pushSubscription.deleteMany({ where: { userId } });
  await tx.pinnedMessage.deleteMany({ where: { pinnedBy: userId } });
  await tx.passwordResetToken.deleteMany({ where: { userId } });
  await tx.messageMention.deleteMany({ where: { userId } });
  await tx.messageReaction.deleteMany({ where: { userId } });

  if (ownedWorkspaceIds.length > 0) {
    await tx.workspace.deleteMany({ where: { id: { in: ownedWorkspaceIds } } });
  }

  await tx.message.updateMany({
    where: { userId, conversation: { workspaceId: ownedWorkspaceIds.length > 0 ? { notIn: ownedWorkspaceIds } : undefined } },
    data: { userId: null },
  });

  await tx.user.delete({ where: { id: userId } });
};

export const isDeleting = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDeleting: true },
  });
  return user?.isDeleting ?? false;
};
