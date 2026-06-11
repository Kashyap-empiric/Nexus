import { Router } from "express";
import { resolveInvite, generateInvite } from "./invites.controller.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.post("/resolve", authMiddleware as any, resolveInvite);
router.post("/generate", authMiddleware as any, generateInvite);

export default router;
