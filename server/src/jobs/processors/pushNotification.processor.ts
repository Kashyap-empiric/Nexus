import webpush from "web-push";
import { prisma } from "@/lib/db.js";
import { ENV } from "@/config/env.js";
import {
  getPushSubscriptionsByUserId,
  deletePushSubscription,
} from "@/modules/notifications/notifications.repository.js";
import * as conversationsRepo from "@/modules/conversations/conversations.repository.js";
import type { PushToMembersJob, PushNotificationJob } from "../types.js";

export async function processPushToMembers(data: PushToMembersJob): Promise<void> {
  const { conversationId, senderId, senderUsername, content, excludeUserId } = data;

  const conv = await conversationsRepo.findById(conversationId);
  if (!conv) return;

  const notificationLink = conv.type === "CHANNEL" && conv.workspaceId
    ? `/workspaces/${conv.workspaceId}/channels/${conversationId}?highlight=latest`
    : `/conversations/${conversationId}`;

  const targetMembers = conv.members.filter(
    m => m.userId !== senderId && m.userId !== excludeUserId
  );

  if (targetMembers.length === 0) return;

  const memberIds = targetMembers.map(m => m.userId);
  const memberUsers = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true,
      pushNotificationsEnabled: true,
      dmNotifications: true,
      channelNotifications: true,
      mentionNotifications: true,
      username: true,
    },
  });

  const userPrefsMap = new Map(memberUsers.map(u => [u.id, u]));

  for (const member of targetMembers) {
    const memberUser = userPrefsMap.get(member.userId);
    if (!memberUser || !memberUser.pushNotificationsEnabled) continue;

    const isMentioned = new RegExp(`@${escapeRegex(memberUser.username)}\\b`).test(content);
    let shouldNotify = false;

    if (conv.type === "DM" && memberUser.dmNotifications) {
      shouldNotify = true;
    } else if (conv.type === "CHANNEL") {
      if (memberUser.mentionNotifications && isMentioned) {
        shouldNotify = true;
      } else if (memberUser.channelNotifications) {
        shouldNotify = true;
      }
    }

    if (shouldNotify) {
      const prefix = conv.type === "CHANNEL" && conv.name ? `#${conv.name}\n\n${senderUsername}` : senderUsername;
      await sendToUser(member.userId, {
        title: "Nexus",
        body: `${prefix}: ${content}`,
        url: notificationLink,
        tag: conversationId,
      });
    }
  }
}

export async function processPushToUser(data: PushNotificationJob): Promise<void> {
  const { userId, payload, force } = data;
  await sendToUser(userId, payload, force);
}

async function sendToUser(
  userId: string,
  payload: { title: string; body?: string; url?: string; tag?: string },
  force = false,
) {
  if (!force) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true },
    });

    if (!user || !user.pushNotificationsEnabled) return;
  }

  const subscriptions = await getPushSubscriptionsByUserId(userId);
  if (!subscriptions || subscriptions.length === 0) return;

  const absoluteUrl = payload.url
    ? payload.url.startsWith("http://") || payload.url.startsWith("https://")
      ? payload.url
      : `${ENV.CLIENT_URL.replace(/\/$/, "")}${payload.url}`
    : undefined;

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: absoluteUrl,
    tag: payload.tag,
  });

  for (const sub of subscriptions) {
    if (!sub.p256dh || !sub.auth) {
      await deletePushSubscription(sub.endpoint);
      continue;
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadString,
        { TTL: 1800, urgency: "high" },
      );
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode === 410 || error.statusCode === 404) {
        await deletePushSubscription(sub.endpoint);
      } else {
        throw err;
      }
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
