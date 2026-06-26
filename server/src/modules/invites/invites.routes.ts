import { Router } from "express";
import { resolveInvite, generateInvite, getInviteInfo, declineInvite } from "./invites.controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rejectDeletingAccount } from "../../middlewares/accountStatus.js";

const router = Router();

router.get("/info", getInviteInfo);
router.post("/resolve", authMiddleware, rejectDeletingAccount, resolveInvite);
router.post("/generate", authMiddleware, rejectDeletingAccount, generateInvite);
router.post("/decline", authMiddleware, rejectDeletingAccount, declineInvite);

export default router;
