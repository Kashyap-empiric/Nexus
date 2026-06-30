# Feature: Notifications

## Goal

Deliver real-time in-app and push notifications to users for events such as invites, mentions, replies, channel activity, workspace changes, and role changes.

---

## Current Status

```
Implemented
```

Full in-app notification system with persistent database storage, real-time socket delivery, push notifications via BullMQ, user preferences, and a categorized UI with type-specific icons.

---

## High-Level Summary

- Notifications are created in the database and delivered via Socket.io in real-time.
- Push notifications are processed asynchronously via BullMQ workers (decoupled from request path).
- Notification preferences are stored on the User model as boolean fields.
- `NotificationService.createAndDispatch()` is the central dispatch function — creates DB record, emits socket event, and enqueues push notification.
- Notification types are categorized: INVITES, REPLIES, WORKSPACE_ACTIVITY, SYSTEM_CRITICAL.
- SYSTEM_CRITICAL notifications bypass user preference checks.
- BellPopover UI categorizes notifications into "Invites" and "Replies" tabs.
- Push subscriptions use VAPID protocol for browser push notifications.

---

## Code Locations

```
Backend

server/src/modules/notifications/notifications.service.ts   — Core dispatch logic
server/src/modules/notifications/notifications.repository.ts — Database CRUD
server/src/modules/notifications/notifications.controller.ts — Request handlers
server/src/modules/notifications/notifications.routes.ts     — Routes
server/src/modules/notifications/notifications.schema.ts     — Zod validation
server/src/modules/notifications/notifications.types.ts     — TypeScript types
server/src/services/push.service.ts                          — VAPID initialization
server/src/jobs/processors/pushNotification.processor.ts     — Push delivery workers
server/src/jobs/processors/fanOutNotification.processor.ts   — Batch notification fan-out
server/src/jobs/types.ts                                     — Job type definitions
server/src/jobs/queues.ts                                    — BullMQ queues
server/src/jobs/workers.ts                                   — Worker registration
server/src/socket/socket.dispatcher.ts                       — Socket dispatch helpers

Database

server/prisma/schema.prisma

Frontend

client/src/modules/notifications/hooks/useNotifications.ts        — React Query hooks
client/src/modules/notifications/api/notifications.api.ts         — API client
client/src/modules/notifications/components/BellPopover.tsx       — Notification popover
client/src/modules/notifications/components/NotificationSettings.tsx — Settings UI
client/src/modules/notifications/utils/notifications-ui.tsx       — Icon/time helpers
client/src/modules/notifications/types/notification.ts            — TypeScript types
client/src/socket/handlers/notification.handlers.ts               — Socket handlers
```

---

## Database

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String?
  link      String?
  imageUrl  String?
  read      Boolean          @default(false)
  metadata  Json?
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt])
  @@index([userId, createdAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique @db.Text
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

enum NotificationType {
  INVITE_RECEIVED
  INVITE_ACCEPTED
  INVITE_DECLINED
  MEMBER_JOINED
  CHANNEL_CREATED
  CHANNEL_MEMBER_ADDED
  CHANNEL_MEMBER_REMOVED
  MEMBER_REMOVED
  MESSAGE_REPLIED
  ROLE_CHANGED
  WORKSPACE_DELETED
  MENTIONED_IN_MESSAGE
  THREAD_REPLY
}
```

- Notification: indexed on `(userId, read, createdAt)` for efficient unread queries.
- PushSubscription: unique on `endpoint`, indexed on `userId`. Cascade delete on user deletion.
- Notification `metadata` is a JSON field.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/notifications` | Required | Paginated notification list |
| GET | `/api/notifications/unread-count` | Required | Unread count |
| PATCH | `/api/notifications/:id/read` | Required | Mark one as read |
| PATCH | `/api/notifications/read-all` | Required | Mark all as read |
| GET | `/api/notifications/preferences` | Required | Get notification preferences |
| PUT | `/api/notifications/preferences` | Required | Update preferences |
| POST | `/api/notifications/push/subscribe` | Required | Subscribe to push |
| DELETE | `/api/notifications/push/subscribe` | Required | Unsubscribe from push |

### Request Validation

- `pushSubscriptionSchema`: endpoint (url), keys.p256dh (string), keys.auth (string).
- `unsubscribePushSchema`: endpoint (url).
- `updatePreferencesSchema`: pushEnabled, dmNotifications, mentionNotifications, channelNotifications, inviteNotifications, replyNotifications, workspaceActivityNotifications (all optional booleans).
- `markAsReadParamsSchema`: id (string, min 1).

### Permissions

- Users can only read/mark their own notifications (enforced via userId filter in repository).
- Push subscriptions scoped to user.
- Auth middleware applied to all endpoints.

---

## Backend Implementation

### Notification Service (`server/src/modules/notifications/notifications.service.ts`)

- **Notification Category Map**: Maps each `NotificationType` to a category (INVITES, REPLIES, WORKSPACE_ACTIVITY, SYSTEM_CRITICAL).
- **Category Preference Map**: Maps categories to corresponding User preference field (e.g., INVITES → `inviteNotifications`).
- **`shouldReceiveNotification()`**: Returns false if user has disabled the category in preferences; SYSTEM_CRITICAL always returns true.
- **`getUserNotifications()`**: Delegates to repository with cursor pagination and optional type filter.
- **`getUnreadCount()`**: Counts notifications where `read === false`.
- **`markAsRead()`**: Updates notification where `id` and `userId` match.
- **`markAllAsRead()`**: Updates all unread notifications for user.
- **`createAndDispatch()`**: Central dispatch function:
  1. Checks user preferences (skips if disabled, unless SYSTEM_CRITICAL).
  2. Creates notification record in DB.
  3. Emits `notification:new` socket event to `user:{userId}` room.
  4. Enqueues `push-to-user` BullMQ job for push delivery.

### Push Notification Processor (`server/src/jobs/processors/pushNotification.processor.ts`)

- **`processPushToMembers()`**: For new messages, checks each member's preferences (pushEnabled, dmNotifications, channelNotifications, mentionNotifications) and sends push to eligible members.
- **`processPushToUser()`**: Sends push notification to a single user.
- **`sendToUser()`**: Fetches push subscriptions, sends web push via `web-push` library, handles endpoint expiration (410/404 → delete subscription).

### FanOut Notification Processor (`server/src/jobs/processors/fanOutNotification.processor.ts`)

- **`processFanOutNotification()`**: Receives array of userIds + notification template. Calls `createAndDispatch()` for each user using `Promise.allSettled`.

---

## Frontend Implementation

### useNotifications (`client/src/modules/notifications/hooks/useNotifications.ts`)

- `useNotifications(type?)` — infinite query with cursor pagination, optional type filter.
- `useUnreadCount()` — query with 30-second refetch interval.
- `useMarkAsRead()` — mutation with optimistic update (decrements count).
- `useMarkAllAsRead()` — mutation with optimistic update (sets count to 0).
- `useNotificationPreferences()` — query with `staleTime: Infinity`, mutation with optimistic update.

### BellPopover (`client/src/modules/notifications/components/BellPopover.tsx`)

- Bell icon button in NavigationRail with unread badge count.
- Tabbed interface: "Invites" and "Replies" tabs.
- Each tab loads its own filtered notification list via `useNotifications(type?)`.
- Accept/Decline buttons for INVITE_RECEIVED notifications.
- Integrated acceptance: clicking Accept calls `POST /api/invites/resolve` and navigates.
- "Mark all as read" button at bottom when unread > 0.
- Link to full notifications page.

### NotificationSettings (`client/src/modules/notifications/components/NotificationSettings.tsx`)

- Push toggle with actual subscription state check.
- Toggles for all notification types: DM, Mentions, Channel messages, Invites, Replies, Workspace Activity.

### NotificationIcon (`client/src/modules/notifications/utils/notifications-ui.tsx`)

- Maps each NotificationType to a Lucide icon with appropriate color.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| In-app notification DB storage | ✅ | `Notification` model in schema.prisma |
| Socket.io real-time delivery | ✅ | `io.to(user:${id}).emit(NOTIFICATION_NEW)` |
| Push notifications via BullMQ | ✅ | `push-to-user` job in pushNotification.processor.ts |
| Notification preferences | ✅ | User model boolean fields, preference endpoints |
| Preference-based filtering | ✅ | `shouldReceiveNotification()` in service |
| SYSTEM_CRITICAL bypass | ✅ | Bypasses preference checks |
| BellPopover with tabs | ✅ | BellPopover.tsx |
| Accept/Decline in invite notifications | ✅ | Inline buttons in BellPopover |
| Push subscription management | ✅ | Subscribe/unsubscribe endpoints |
| N+1 push queries per message | ⚠️ | Iterates members individually (not batched) |
| pushsubscriptionchange handler | ❌ | Not implemented in service worker |
| Channel message notification toggle | ❌ | `channelNotifications` preference exists but UI default is OFF |
| THREAD_REPLY notifications | ✅ | Type exists in enum, preference maps to `replyNotifications` |
| MENTIONED_IN_MESSAGE notifications | ✅ | Type exists, dispatched from messages.service.ts |
| Desktop notification preference gating | ✅ | Thread replies check replyNotifications; channels check mentionNotifications + channelNotifications; DMs check dmNotifications |
| Preference auto-fetch on socket event | ✅ | Preferences fetched from API if not in cache on message:new |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| User receives invite | Notification created, socket emit, push sent | `createAndDispatch` called with INVITE_RECEIVED | ✅ |
| User disables invite notifications | No notification created | `shouldReceiveNotification` returns false | ✅ |
| User disables all notifications | SYSTEM_CRITICAL still delivered | Bypasses preference check | ✅ |
| New message in DM | Push sent to other member if dmNotifications enabled | `processPushToMembers` checks dmNotifications | ✅ |
| New message in channel | Push sent if channelNotifications or mention matches | `processPushToMembers` checks both | ✅ |
| User mentioned in channel | Push sent (mentionNotifications) | Regex match on content | ✅ |
| User has no push subscriptions | Push skipped gracefully | `getPushSubscriptionsByUserId` returns empty | ✅ |
| Push endpoint expired (410) | Subscription deleted | `deletePushSubscription` called | ✅ |
| User marks notification as read | Unread count decremented | Optimistic update in `useMarkAsRead` | ✅ |
| User marks all as read | Unread count set to 0 | Optimistic update in `useMarkAllAsRead` | ✅ |
| New notification arrives via socket | BellPopover badge updates | `handleNotificationNew` in event router | ✅ |
| BullMQ unavailable | Push skipped, in-app still works | Queue null check | ✅ |

---

## Current Flow

```
Event occurs (invite, mention, reply, etc.)
  ↓
Caller invokes createAndDispatch(input)
  ↓
createAndDispatch:
  1. Fetch user preferences
  2. If not SYSTEM_CRITICAL and user disabled → skip
  3. Create Notification row in DB
  4. Emit NOTIFICATION_NEW socket event to user:{userId}
  5. Enqueue push-to-user BullMQ job
  ↓
BullMQ worker processPushToUser:
  1. Check pushNotificationsEnabled
  2. Fetch push subscriptions
  3. Send web push via VAPID
  4. Handle expired endpoints
```

---

## Missing Pieces

```
□ Batch push notification queries (WHERE userId IN) instead of N+1
□ pushsubscriptionchange handler in service worker
□ Filtered notification queries by multiple categories
□ Notification read receipts (seen at timestamps)
□ Email notification delivery option
□ Push notification click tracking
□ Notification grouping (e.g., "5 new messages from #general")
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| User disables all notifications | SYSTEM_CRITICAL still delivered | ✅ |
| User has 100+ push subscriptions | All sent sequentially (no batching) | ⚠️ |
| Push endpoint returns 410 | Endpoint deleted, no retry | ✅ |
| Push endpoint returns non-410/404 error | Error thrown, job retried by BullMQ | ⚠️ |
| Notification for deleted user | Cascade delete removes notifications | ✅ |
| Concurrent mark-all-as-read + new notification | New notification may be marked read incorrectly | ⚠️ |
| User has no preference record | Default values used (all true) | ✅ |

---

## Files Inspected

```
server/src/modules/notifications/notifications.service.ts
server/src/modules/notifications/notifications.repository.ts
server/src/modules/notifications/notifications.controller.ts
server/src/modules/notifications/notifications.routes.ts
server/src/modules/notifications/notifications.schema.ts
server/src/modules/notifications/notifications.types.ts
server/src/services/push.service.ts
server/src/jobs/processors/pushNotification.processor.ts
server/src/jobs/processors/fanOutNotification.processor.ts
server/src/jobs/processors/sendEmail.processor.ts
server/src/jobs/processors/batchInvite.processor.ts
server/src/jobs/processors/revokeInvite.processor.ts
server/src/jobs/processors/deleteAccount.processor.ts
server/src/jobs/processors/cleanup.processor.ts
server/src/jobs/types.ts
server/src/jobs/queues.ts
server/src/jobs/workers.ts
server/prisma/schema.prisma
client/src/modules/notifications/hooks/useNotifications.ts
client/src/modules/notifications/api/notifications.api.ts
client/src/modules/notifications/components/BellPopover.tsx
client/src/modules/notifications/components/NotificationSettings.tsx
client/src/modules/notifications/utils/notifications-ui.tsx
client/src/modules/notifications/types/notification.ts
client/src/socket/handlers/notification.handlers.ts
```
