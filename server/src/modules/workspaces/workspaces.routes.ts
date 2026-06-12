import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { getWorkspaceChannels } from "./workspaces.controller";

const router = Router();

router.use(authMiddleware);
router.get("/:id/channels", getWorkspaceChannels);

export default router;
