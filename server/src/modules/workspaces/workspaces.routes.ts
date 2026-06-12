import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import {
  getUserWorkspaces,
  getWorkspaceDetails,
  getWorkspaceChannels,
  createWorkspace,
  createChannel,
  updateChannel,
  deleteChannel,
  getWorkspaceMembers,
  updateMemberRole,
} from "./workspaces.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getUserWorkspaces);
router.post("/", createWorkspace);
router.get("/:id", getWorkspaceDetails);
router.get("/:id/channels", getWorkspaceChannels);
router.post("/:id/channels", createChannel);
router.patch("/:id/channels/:channelId", updateChannel);
router.delete("/:id/channels/:channelId", deleteChannel);
router.get("/:id/members", getWorkspaceMembers);
router.patch("/:id/members/:userId/role", updateMemberRole);

export default router;
