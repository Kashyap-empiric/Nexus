import type { Request, Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as usersService from "./users.service.js";
import type { SearchUsersQuery } from "./users.schema.js";
import { ENV } from "@/config/env.js";

export const checkUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const username = req.query.username as string;
    if (!username || typeof username !== "string" || username.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters." });
      return;
    }
    const existing = await usersService.findByUsername(username);
    res.json({ available: !existing });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resolveUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.body as { username?: string };
    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Username is required." });
      return;
    }
    const user = await usersService.findByUsername(username);
    res.json({ email: user?.email || null });
  } catch (error) {
    console.error("Error resolving username:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query as unknown as SearchUsersQuery;
    const currentUserId = req.user!.id;

    const users = await usersService.searchUsers(q, currentUserId);

    res.json({ data: users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await usersService.getMyProfile(userId);
    res.json({ data: profile });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = req.body;
    const updatedProfile = await usersService.updateProfile(userId, data);
    
    dispatchUserProfileUpdate(userId);

    res.json({ data: updatedProfile });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPublicProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const profile = await usersService.getPublicProfile(id);
    res.json({ data: profile });
  } catch (error) {
    console.error("Error getting public profile:", error);
    res.status(404).json({ error: "Profile not found" });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { avatarUrl } = req.body;
    
    const avatarPrefix = `${ENV.SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`;
    if (avatarUrl && !avatarUrl.startsWith(avatarPrefix)) {
      res.status(403).json({ error: "Forbidden avatar URL" });
      return;
    }

    const updatedProfile = await usersService.updateAvatar(userId, avatarUrl);
    
    dispatchUserProfileUpdate(userId);

    res.json({ data: updatedProfile });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

import { dispatchUserStatusUpdate, dispatchUserProfileUpdate } from "@/socket/socket.dispatcher.js";

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, statusText } = req.body;
    const updatedProfile = await usersService.updateStatus(userId, status, statusText);
    
    dispatchUserStatusUpdate(userId, status, statusText || null);

    res.json({ data: updatedProfile });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
