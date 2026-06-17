import * as usersRepo from "./users.repository.js";
import { extractAvatarPath } from "@/utils/upload.js";

export const searchUsers = async (query: string, currentUserId: string) => {
  return usersRepo.searchUsers(query, currentUserId);
};

export const findByUsername = async (username: string) => {
  return usersRepo.findUserByUsername(username);
};

export const getMyProfile = async (userId: string) => {
  const user = await usersRepo.findUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
};

export const getPublicProfile = async (id: string) => {
  const profile = await usersRepo.findPublicProfileById(id);
  if (!profile) throw new Error("Profile not found");
  return profile;
};

export const updateProfile = async (
  userId: string,
  data: {
    username?: string;
    fullName?: string | null;
    bio?: string | null;
    isOnboarded?: boolean;
  }
) => {
  return usersRepo.updateUser(userId, data);
};

export const updateAvatar = async (
  userId: string,
  avatarUrl: string | null
) => {
  const avatarPath = extractAvatarPath(avatarUrl);
  return usersRepo.updateUser(userId, { avatarUrl, avatarPath });
};

export const updateStatus = async (
  userId: string,
  status: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE",
  statusText?: string | null
) => {
  return usersRepo.updateUser(userId, { status, statusText });
};
