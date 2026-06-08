import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import {
  createConversation,
  getConversations,
  getConversationDetails,
  markConversationAsRead
} from "./conversations.controller.js";
import { createConversationSchema, markReadSchema } from "./conversations.schema.js";
import { requireConversationMember } from "@/middlewares/requireConversationMember.js";

import messagesRoutes from "@/modules/messages/messages.routes.js";

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

router.patch(
  "/:id/read",
  authMiddleware,
  validate({ body: markReadSchema }),
  requireConversationMember({ paramName: "id" }),
  markConversationAsRead
);

export default router;
