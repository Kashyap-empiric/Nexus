import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  createConversation,
  getConversations,
  getConversationDetails,
} from "./conversations.controller.js";
import { createConversationSchema } from "./conversations.schema.js";
import { requireConversationMember } from "../../middlewares/requireConversationMember.js";

import messagesRoutes from "../messages/messages.routes.js";

const router = Router();

router.use("/:conversationId/messages", messagesRoutes);

router.get(
  "/",
  authMiddleware,
  getConversations
);

router.post(
  "/",
  authMiddleware,
  validate({ body: createConversationSchema }),
  createConversation
);

router.get(
  "/:id",
  authMiddleware,
  requireConversationMember({ paramName: "id" }),
  getConversationDetails
);

export default router;
