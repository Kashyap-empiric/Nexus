import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { rejectDeletingAccount } from "@/middlewares/accountStatus.js";
import { validate } from "@/middlewares/validate.js";
import { generalLimiter } from "@/middlewares/rateLimiter.js";
import { searchUsers, getMyProfile, updateProfile, updateAvatar, updateStatus, getPublicProfile, checkUsername, resolveUsername, deleteAccount } from "./users.controller.js";
import { searchUsersQuerySchema, updateProfileSchema, updateAvatarSchema, updateStatusSchema, deleteAccountSchema } from "./users.schema.js";

const router = Router();

router.get("/check-username", checkUsername);
router.post("/resolve-username", resolveUsername);

router.get("/me", authMiddleware, getMyProfile);
router.patch("/me", authMiddleware, rejectDeletingAccount, validate({ body: updateProfileSchema }), updateProfile);
router.patch("/me/avatar", authMiddleware, rejectDeletingAccount, validate({ body: updateAvatarSchema }), updateAvatar);
router.patch("/me/status", authMiddleware, rejectDeletingAccount, validate({ body: updateStatusSchema }), updateStatus);
router.delete("/me", authMiddleware, validate({ body: deleteAccountSchema }), deleteAccount);

router.get(
  "/search",
  authMiddleware,
  generalLimiter,
  validate({ query: searchUsersQuerySchema }),
  searchUsers
);

router.get("/:id", authMiddleware, getPublicProfile);

export default router;
