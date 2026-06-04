import { Router } from "express";
import { getConversations } from "./conversations.controller.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.get("/", authMiddleware, getConversations);

export default router;
