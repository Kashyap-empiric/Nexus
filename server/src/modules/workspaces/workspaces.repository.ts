import { prisma } from "@/lib/db.js";

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
