import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import { requireConversationMember } from "@/middlewares/requireConversationMember.js";
import { messageLimiter } from "@/middlewares/rateLimiter.js";
import { createMessage, getMessages, updateMessage, deleteMessage } from "./messages.controller.js";
import { createMessageBodySchema, getMessagesQuerySchema, messageParamsSchema, messageIdParamsSchema, updateMessageBodySchema } from "./messages.schema.js";

// mergeParams: true is critical so we can access :conversationId from the parent router
const router = Router({ mergeParams: true });

router.get(
  "/",
  authMiddleware,
  validate({ params: messageParamsSchema, query: getMessagesQuerySchema }),
  requireConversationMember({ paramName: "conversationId" }),
  getMessages
);

router.post(
  "/",
  messageLimiter,
  authMiddleware,
  validate({ params: messageParamsSchema, body: createMessageBodySchema }),
  requireConversationMember({ paramName: "conversationId" }),
  createMessage
);

router.patch(
  "/:messageId",
  messageLimiter,
  authMiddleware,
  validate({ params: messageIdParamsSchema, body: updateMessageBodySchema }),
  requireConversationMember({ paramName: "conversationId" }),
  updateMessage
);

router.delete(
  "/:messageId",
  messageLimiter,
  authMiddleware,
  validate({ params: messageIdParamsSchema }),
  requireConversationMember({ paramName: "conversationId" }),
  deleteMessage
);

export default router;
