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
          id: { not: currentUserId },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
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
