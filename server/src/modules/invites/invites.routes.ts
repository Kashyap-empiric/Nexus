import { Router } from "express";
import { resolveInvite, generateInvite, getInviteInfo, declineInvite } from "./invites.controller.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.get("/info", getInviteInfo);
router.post("/resolve", authMiddleware as any, resolveInvite);
router.post("/generate", authMiddleware as any, generateInvite);
router.post("/decline", authMiddleware as any, declineInvite);

export default router;
