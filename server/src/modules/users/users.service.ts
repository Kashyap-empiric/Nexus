import { prisma } from "@/lib/db.js";

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
          id: { not: currentUserId }, // Don't return the current user
        },
      ],
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
    take: 10,
  });
};
