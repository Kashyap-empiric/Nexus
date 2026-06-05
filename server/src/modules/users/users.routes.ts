import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { searchUsers } from "./users.controller.js";
import { searchUsersQuerySchema } from "./users.schema.js";

const router = Router();

router.get(
  "/search",
  authMiddleware,
  validate({ query: searchUsersQuerySchema }),
  searchUsers
);

export default router;
