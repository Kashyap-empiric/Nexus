import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import {
  getUserWorkspaces,
  getWorkspaceDetails,
  getWorkspaceChannels,
  createWorkspace,
  createChannel,
} from "./workspaces.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getUserWorkspaces);
router.post("/", createWorkspace);
router.get("/:id", getWorkspaceDetails);
router.get("/:id/channels", getWorkspaceChannels);
router.post("/:id/channels", createChannel);

export default router;
