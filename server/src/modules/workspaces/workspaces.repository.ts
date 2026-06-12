import { prisma } from "@/lib/db.js";
import type { Prisma, WorkspaceRole } from "@prisma/client";

export const findWorkspaceById = async (workspaceId: string) => {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
    },
  });
};

export const findWorkspaceByIdOrSlug = async (identifier: string) => {
  return prisma.workspace.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
    },
    include: {
      channels: true,
      members: {
        include: { user: true },
      },
    },
  });
};

export const findUserWorkspaces = async (userId: string) => {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
};

// ====== Writes ======

export const createWorkspaceInTransaction = async (
  tx: Prisma.TransactionClient,
  data: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    ownerId: string;
    members: {
      create: { userId: string; role: WorkspaceRole };
    };
  }
) => {
  return tx.workspace.create({
    data,
  });
};

export const createChannelInTransaction = async (
  tx: Prisma.TransactionClient,
  data: {
    id: string;
    type: "CHANNEL";
    workspaceId: string;
    isPrivate: boolean;
    visibility: "PUBLIC" | "PRIVATE";
    createdBy: string;
    name: string;
    members: {
      create: Array<{ userId: string }>;
    };
  }
) => {
  return tx.conversation.create({
    data,
    include: {
      members: {
        include: { user: true },
      },
    },
  });
};

export const createChannel = async (data: {
  id: string;
  type: "CHANNEL";
  workspaceId: string;
  isPrivate: boolean;
  visibility: "PUBLIC" | "PRIVATE";
  createdBy: string;
  name: string;
  members: {
    create: Array<{ userId: string }>;
  };
}) => {
  return prisma.conversation.create({
    data,
    include: {
      members: {
        include: { user: true },
      },
    },
  });
};

export const onboardUserToWorkspaceInTransaction = async (
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string
): Promise<{ generalChannelId: string }> => {
  const generalChannel = await tx.conversation.findFirst({
    where: {
      workspaceId,
      name: "general",
      type: "CHANNEL",
    },
    select: { id: true },
  });

  if (!generalChannel) {
    throw new Error("GENERAL_CHANNEL_NOT_FOUND");
  }

  try {
    await tx.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: "MEMBER",
      },
    });

    await tx.conversationMember.create({
      data: {
        conversationId: generalChannel.id,
        userId,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint failed -> User is already a member
      // Gracefully ignore
    } else {
      throw error;
    }
  }

  return { generalChannelId: generalChannel.id };
};

export const updateChannel = async (channelId: string, data: { name?: string; visibility?: "PUBLIC" | "PRIVATE"; isPrivate?: boolean }) => {
  return prisma.conversation.update({
    where: { id: channelId },
    data,
  });
};

export const deleteConversation = async (channelId: string) => {
  return prisma.conversation.delete({
    where: { id: channelId },
  });
};

export const updateWorkspaceMemberRole = async (workspaceId: string, userId: string, role: WorkspaceRole) => {
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { role },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });
};
