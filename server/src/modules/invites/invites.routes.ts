import { Router } from "express";
import { resolveInvite, generateInvite, getInviteInfo, declineInvite } from "./invites.controller.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.get("/info", getInviteInfo);
router.post("/resolve", authMiddleware, resolveInvite);
router.post("/generate", authMiddleware, generateInvite);
router.post("/decline", authMiddleware, declineInvite);

export default router;
