import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { isWorkspaceMember } from "@/shared/permissions.js";
import * as workspacesService from "./workspaces.service.js";

export const getWorkspaceChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden: Not a member of this workspace" });
      return;
    }

    const channels = await workspacesService.getWorkspaceChannels(workspaceId);

    res.json({ data: channels });
  } catch (error) {
    console.error("Error fetching workspace channels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
