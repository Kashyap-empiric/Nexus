import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import * as notificationsService from "./notifications.service.js";
import { savePushSubscription, deletePushSubscription } from "./notifications.repository.js";
import { pushSubscriptionSchema, unsubscribePushSchema } from "./notifications.schema.js";
import { prisma } from "@/lib/db.js";


export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { cursor, limit, type } = req.query as { cursor?: string; limit?: string; type?: string };

    const result = await notificationsService.getUserNotifications(userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await notificationsService.getUnreadCount(userId);
    res.json(result);
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const result = await notificationsService.markAsRead(id, userId);
    res.json(result);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await notificationsService.markAllAsRead(userId);
    res.json(result);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const subscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = pushSubscriptionSchema.parse(req.body);
    const userAgent = req.headers["user-agent"];

    console.log(`[Push Backend] Received subscription request for user ${userId}. Endpoint: ${body.endpoint.substring(0, 50)}...`);

    await savePushSubscription(
      userId,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
      userAgent
    );

    console.log(`[Push Backend] Successfully saved push subscription for user ${userId}.`);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("[Push Backend] Error saving push subscription:", error);
    res.status(400).json({ error: "Invalid subscription data" });
  }
};


export const unsubscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = unsubscribePushSchema.parse(req.body);
    console.log(`[Push Backend] Received unsubscribe request for user ${userId}. Endpoint: ${body.endpoint.substring(0, 50)}...`);
    await deletePushSubscription(body.endpoint);
    console.log(`[Push Backend] Successfully deleted push subscription for user ${userId}.`);
    res.json({ success: true });
  } catch (error) {
    console.error("[Push Backend] Error deleting push subscription:", error);
    res.status(400).json({ error: "Invalid request data" });
  }
};


export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        pushNotificationsEnabled: true,
        dmNotifications: true,
        mentionNotifications: true,
        channelNotifications: true,
        inviteNotifications: true,
        replyNotifications: true,
        workspaceActivityNotifications: true,
      }
    });
    
    res.json({
      pushEnabled: user?.pushNotificationsEnabled ?? false,
      dmNotifications: user?.dmNotifications ?? true,
      mentionNotifications: user?.mentionNotifications ?? true,
      channelNotifications: user?.channelNotifications ?? false,
      inviteNotifications: user?.inviteNotifications ?? true,
      replyNotifications: user?.replyNotifications ?? true,
      workspaceActivityNotifications: user?.workspaceActivityNotifications ?? true,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const prefs = req.body as {
      pushEnabled?: boolean;
      dmNotifications?: boolean;
      mentionNotifications?: boolean;
      channelNotifications?: boolean;
      inviteNotifications?: boolean;
      replyNotifications?: boolean;
      workspaceActivityNotifications?: boolean;
    };

    const dataToUpdate: Record<string, boolean> = {};
    if (prefs.pushEnabled !== undefined) dataToUpdate.pushNotificationsEnabled = prefs.pushEnabled;
    if (prefs.dmNotifications !== undefined) dataToUpdate.dmNotifications = prefs.dmNotifications;
    if (prefs.mentionNotifications !== undefined) dataToUpdate.mentionNotifications = prefs.mentionNotifications;
    if (prefs.channelNotifications !== undefined) dataToUpdate.channelNotifications = prefs.channelNotifications;
    if (prefs.inviteNotifications !== undefined) dataToUpdate.inviteNotifications = prefs.inviteNotifications;
    if (prefs.replyNotifications !== undefined) dataToUpdate.replyNotifications = prefs.replyNotifications;
    if (prefs.workspaceActivityNotifications !== undefined) dataToUpdate.workspaceActivityNotifications = prefs.workspaceActivityNotifications;

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushNotificationsEnabled: true,
        dmNotifications: true,
        mentionNotifications: true,
        channelNotifications: true,
        inviteNotifications: true,
        replyNotifications: true,
        workspaceActivityNotifications: true,
      }
    });

    res.json({
      pushEnabled: user?.pushNotificationsEnabled ?? false,
      dmNotifications: user?.dmNotifications ?? true,
      mentionNotifications: user?.mentionNotifications ?? true,
      channelNotifications: user?.channelNotifications ?? false,
      inviteNotifications: user?.inviteNotifications ?? true,
      replyNotifications: user?.replyNotifications ?? true,
      workspaceActivityNotifications: user?.workspaceActivityNotifications ?? true,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
