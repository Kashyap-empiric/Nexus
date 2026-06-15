import * as usersRepo from "./users.repository.js";

export const searchUsers = async (query: string, currentUserId: string) => {
  return usersRepo.searchUsers(query, currentUserId);
};

export const getMyProfile = async (userId: string) => {
  const user = await usersRepo.findUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
};

export const updateProfile = async (
  userId: string,
  data: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isOnboarded?: boolean;
  }
) => {
  // if username is being updated, we could check for conflicts here, but Prisma will throw a unique constraint error
  return usersRepo.updateUser(userId, data);
};
