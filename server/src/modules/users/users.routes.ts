import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import { searchUsers, getMyProfile, updateProfile, updateAvatar, updateStatus, getPublicProfile } from "./users.controller.js";
import { searchUsersQuerySchema, updateProfileSchema, updateAvatarSchema, updateStatusSchema } from "./users.schema.js";

const router = Router();

router.get("/me", authMiddleware, getMyProfile);
router.patch("/me", authMiddleware, validate({ body: updateProfileSchema }), updateProfile);
router.patch("/me/avatar", authMiddleware, validate({ body: updateAvatarSchema }), updateAvatar);
router.patch("/me/status", authMiddleware, validate({ body: updateStatusSchema }), updateStatus);

router.get(
  "/search",
  authMiddleware,
  validate({ query: searchUsersQuerySchema }),
  searchUsers
);

router.get("/:id", authMiddleware, getPublicProfile);

export default router;
