import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { rejectDeletingAccount } from "@/middlewares/accountStatus.js";
import { validate } from "@/middlewares/validate.js";
import { pushLimiter } from "@/middlewares/rateLimiter.js";
import { updatePreferencesSchema } from "./notifications.schema.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribePush,
  unsubscribePush,
  getPreferences,
  updatePreferences,
} from "./notifications.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(rejectDeletingAccount);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

router.get("/preferences", getPreferences);
router.put("/preferences", validate({ body: updatePreferencesSchema }), updatePreferences);

router.post("/push/subscribe", pushLimiter, subscribePush);
router.delete("/push/subscribe", pushLimiter, unsubscribePush);

export default router;
