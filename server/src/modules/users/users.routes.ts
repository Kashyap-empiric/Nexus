import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import { searchUsers, getMyProfile, updateProfile } from "./users.controller.js";
import { searchUsersQuerySchema, updateProfileSchema } from "./users.schema.js";

const router = Router();

router.get("/me", authMiddleware, getMyProfile);
router.patch("/me", authMiddleware, validate({ body: updateProfileSchema }), updateProfile);

router.get(
  "/search",
  authMiddleware,
  validate({ query: searchUsersQuerySchema }),
  searchUsers
);

export default router;
