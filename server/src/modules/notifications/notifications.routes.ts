import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
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

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

router.post("/push/subscribe", subscribePush);
router.delete("/push/subscribe", unsubscribePush);

export default router;
