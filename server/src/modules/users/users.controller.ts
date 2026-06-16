import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as usersService from "./users.service.js";
import type { SearchUsersQuery } from "./users.schema.js";

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
    
    // Emit socket event so other users see the profile changes (name, bio, etc.)
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
    const { avatarPath } = req.body;
    
    // Security: avatarPath must start with userId/ or be null
    if (avatarPath && !avatarPath.startsWith(`${userId}/`)) {
      res.status(403).json({ error: "Forbidden avatar path" });
      return;
    }

    const updatedProfile = await usersService.updateAvatar(userId, avatarPath);
    
    // Emit socket event so other users see the new avatar
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
    
    // Emit socket event
    dispatchUserStatusUpdate(userId, status, statusText || null);

    res.json({ data: updatedProfile });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
