import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { requireConversationMember } from "../../middlewares/requireConversationMember.js";
import { messageLimiter } from "../../middlewares/rateLimiter.js";
import { createMessage, getMessages } from "./messages.controller.js";
import { createMessageBodySchema, getMessagesQuerySchema, messageParamsSchema } from "./messages.schema.js";

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

export default router;
