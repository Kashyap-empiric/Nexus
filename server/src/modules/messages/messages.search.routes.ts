import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import { searchMessages } from "./messages.controller.js";
import { searchMessagesQuerySchema } from "./messages.schema.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  validate({ query: searchMessagesQuerySchema }),
  searchMessages
);

export default router;
