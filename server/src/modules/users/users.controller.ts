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
    res.json({ data: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
