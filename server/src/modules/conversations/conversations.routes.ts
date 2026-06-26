import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { rejectDeletingAccount } from "@/middlewares/accountStatus.js";
import { validate } from "@/middlewares/validate.js";
import {
  createConversation,
  getConversations,
  getConversationDetails,
  markConversationAsRead
} from "./conversations.controller.js";
import { createConversationSchema, markReadSchema } from "./conversations.schema.js";
import { pinsParamsSchema, pinsIdParamsSchema } from "@/modules/messages/messages.schema.js";
import { requireConversationMember } from "@/middlewares/requireConversationMember.js";

import messagesRoutes from "@/modules/messages/messages.routes.js";
import { pinMessage, unpinMessage, getPinnedMessages, getChannelThreads } from "@/modules/messages/messages.controller.js";

const router = Router();

router.use("/:conversationId/messages", messagesRoutes);

router.get(
  "/:conversationId/threads",
  authMiddleware,
  requireConversationMember({ paramName: "conversationId" }),
  getChannelThreads
);

router.post(
  "/:conversationId/pins/:messageId",
  authMiddleware,
  rejectDeletingAccount,
  validate({ params: pinsIdParamsSchema }),
  requireConversationMember({ paramName: "conversationId" }),
  pinMessage
);

router.delete(
  "/:conversationId/pins/:messageId",
  authMiddleware,
  rejectDeletingAccount,
  validate({ params: pinsIdParamsSchema }),
  requireConversationMember({ paramName: "conversationId" }),
  unpinMessage
);

router.get(
  "/:conversationId/pins",
  authMiddleware,
  validate({ params: pinsParamsSchema }),
  requireConversationMember({ paramName: "conversationId" }),
  getPinnedMessages
);

router.get(
  "/",
  authMiddleware,
  getConversations
);

router.post(
  "/",
  authMiddleware,
  rejectDeletingAccount,
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
  rejectDeletingAccount,
  validate({ body: markReadSchema }),
  requireConversationMember({ paramName: "id" }),
  markConversationAsRead
);

export default router;
