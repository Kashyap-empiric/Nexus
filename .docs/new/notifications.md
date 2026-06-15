# Notifications & Inbox — Implementation Plan

> **Status:** 🟡 **In progress — client UI complete, server backend implemented, Phase 3 (web push) detailed below.**
>
> **What's done:** Client-side UI (BellPopover, notifications page, settings page), socket handler (`notification.handlers.ts`), API client, React Query hooks, DB schema (`Notification` + `PushSubscription` tables exist via migration), server-side module (controller, service, repository, routes, socket dispatch), notification integration into invite/channel flows.
>
> **What's missing:** Web push notifications (Service Worker + VAPID) so notifications work when the browser window is closed.

---

## Key Architectural Decisions (from review)

### 1. Do NOT create notifications for every message

Messages are the **source of truth** for unread state. The `ConversationMember.lastReadMessageId` already provides:

- Which conversations are unread
- Unread message counts
- Mentions (future)
- Inbox summaries

The `Notification` table is **only for actual notification events** — events users need to be explicitly told about:

- Workspace invites received
- Invite accepted by someone
- Member joined a channel/workspace
- Channel created
- Mentions (`@user`) — Phase 2

This prevents the table from exploding in volume and keeps the system simple.

### 2. Bell icon = Activity Feed, not message notification feed

Slack's bell is an **Activity** feed, not "every message that happened."

MVP activity items:
```
🔔 Activity

- Robin mentioned you
- Workspace invite received
- Alex joined #frontend
- Invite accepted
```

Unread DMs and channels remain in the sidebar — that's where users find their conversations.

### 3. No notification backfill

On socket connect or login, **do not** create notification records from unread messages. The `lastReadMessageId` already captures unread state. Backfill introduces:

- Duplication
- Race conditions
- Cleanup complexity

Instead:
```
Login
  → fetch conversations
  → compute unread counts from lastReadMessageId
```

No notification generation needed.

### 4. Notification preferences deferred

`NotificationPreference` is **not needed for MVP**. Start with a simple client-side toggle:

```
Enable Desktop Notifications
```

stored in localStorage. Add `NotificationPreference` as a server model later when implementing push notifications.

### 5. Push subscriptions table — keep as designed

The `PushSubscription` model is correct and should stay. It's needed for push notifications in Phase 3.

### 6. Bell badge = unread activity items, NOT unread messages

Avoid counting unread messages in the bell badge — you already show them in the sidebar:

```
#general (12)
DM Robin (3)
```

Instead:
```
Bell badge = unread activity items
```

such as invites, mentions, join events, system events. This prevents duplicate indicators.

---

## Recommended Phasing

| Phase | Scope |
|---|---|
| **Phase 1** | Bell icon + Activity table + workspace invites + invite accepted + channel/member events |
| **Phase 2** | Mentions (`@user`) generate activity items |
| **Phase 3** | Push notifications — see detailed breakdown below |
| **Phase 4** | Advanced notification routing |

Unread messages and notifications remain two **separate systems**. This is the model used by Slack and Discord — it scales better and avoids turning the notifications table into a copy of the messages table.

---

## Existing Infrastructure Audit

### What already exists

| Asset | Location | Status |
|---|---|---|
| `showMessageNotification()` | `client/src/shared/lib/notifications.ts` | ✅ Works — fires browser Notification when tab is hidden |
| `requestNotificationPermission()` | Same file | ✅ Called in `SocketProvider` on mount |
| `showNotification()` | Same file | ✅ Generic helper with `onClickUrl` navigation |
| Socket `message:new` event | `message.handlers.ts` → `handleMessageNew` | ✅ Triggers desktop notification + title badge |
| Socket `user:online` / `user:offline` | `socketProvider.tsx` | ✅ Presence tracking exists |
| Invite generation | `InviteModal.tsx` + backend | ✅ Shareable link generation |
| Invite resolution | `InviteProcessor.tsx` + `handleInvite.ts` | ✅ Token-based join flow |
| `Conversation.unreadCount` | Sidebar cache | ✅ Client-side computed count |
| `ConversationMember.lastReadMessageId` | Prisma schema | ✅ Read tracking exists |

### What's missing

| Gap | Impact |
|---|---|
| No activity/notification history table | Cannot show an inbox — no persistence of past notifications |
| No inbox page or route | Users have no centralized view of missed activity |
| No bell icon in header | No entry point for the inbox |
| No invite-as-notification flow | Invites are link-based only — no in-app invite inbox |
| No push notifications (Service Worker) | Notifications only work while app is open in a tab |
| No unread notification badge on bell | No way to know about new inbox items without opening it |

---

## Architecture

### 1. Database models

Two tables for MVP: `Notification` (activity items) and `PushSubscription` (where to deliver — Phase 3). `NotificationPreference` is deferred to Phase 3.

```prisma
enum NotificationType {
  INVITE_RECEIVED   // workspace invite sent TO this user
  INVITE_ACCEPTED   // someone accepted THIS user's invite (sent to the inviter)
  MEMBER_JOINED     // someone joined a channel/workspace
  CHANNEL_CREATED   // new channel created
  // Phase 2:
  // MENTION         // @user in a message
}

model Notification {
  id        String           @id @default(cuid())
  userId    String           // who receives this notification
  type      NotificationType
  title     String           // "Workspace invitation"
  body      String?          // context preview
  link      String?          // "/invite?token=xyz" to navigate on click
  imageUrl  String?          // sender avatar, workspace icon, etc.
  read      Boolean          @default(false)
  metadata  Json?            // varies by type (see table below)
  createdAt DateTime         @default(now())

  @@index([userId, read, createdAt])
  @@index([userId, createdAt])
}

// Phase 3.4:
// model NotificationPreference {
//   userId    String  @id
//   pushEnabled           Boolean @default(false)
//   dmNotifications       Boolean @default(true)
//   mentionNotifications  Boolean @default(true)
//   channelNotifications  Boolean @default(false)
//
//   user User @relation(fields: [userId], references: [id], onDelete: Cascade)
// }

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique @db.Text
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Why a new table instead of deriving from conversations/invites:**
- Deriving would require complex queries across 3+ tables with different shapes
- Denormalized storage is fast for the inbox query
- The `read` flag is simple to toggle
- Future notification types (reactions, mentions) are trivial to add

**`metadata` structure per type:**

| Type | `metadata` fields |
|---|---|
| `INVITE_RECEIVED` | `{ workspaceId, workspaceName, inviterId, inviterName, token }` |
| `INVITE_ACCEPTED` | `{ workspaceId, workspaceName, joinerId, joinerName }` |
| `MEMBER_JOINED` | `{ channelId, channelName, workspaceId, joinerId, joinerName }` |
| `CHANNEL_CREATED` | `{ channelId, channelName, workspaceId, creatorId }` |

### 2. Activity creation triggers

Activity items are created by the **server** when events happen, not the client. This ensures they persist across devices and sessions.

| Trigger | Who creates | Notification type |
|---|---|---|
| Invite sent to user | Invite service | `INVITE_RECEIVED` |
| Invite accepted by someone | Invite resolver | `INVITE_ACCEPTED` — sent to the user who created the invite |
| User added to private channel | Channel service | `MEMBER_JOINED` |
| New public channel created | Channel service | `CHANNEL_CREATED` — workspace-wide (pinned, not noisy) |

**Notable exclusions:**
- New messages do **not** create activity items (use `lastReadMessageId` for unread state)
- No notification backfill on socket connect or login

### 3. Push notifications strategy (two layers)

**Layer 1: Socket-based (existing, enhanced)** — Works while the app has an active socket connection
- Already works via `handleMessageNew` (fires when tab is hidden)
- The existing desktop notification for new messages stays (it's a browser notification, not the activity inbox)
- Phase 1: activity items delivered via `notification:new` socket event to update the bell badge in real-time

**Layer 2: Service Worker Push (detailed below)** — Works when app is closed entirely
- Uses the Web Push API (VAPID + `web-push` library)
- Service Worker listens for `push` events and shows native notifications
- `notificationclick` handler navigates to the relevant conversation/page

---

## Implementation Steps

### Phase 1: Backend — Activity Infrastructure

#### Step 1: Database migration

- [x] Add `Notification` model and `NotificationType` enum to Prisma schema — ✅ **DONE** (included in workspace migration)
- [x] Run migration — ✅ **DONE** (applied to dev database)
- [x] Add `@@index([userId, read, createdAt])` for fast inbox queries — ✅ **DONE** (in schema)
- [x] Do **NOT** add `NotificationPreference` model yet — ✅ **Not added**

#### Step 2: Notification repository and service

- [x] Create `server/src/modules/notifications/notifications.repository.ts` — ✅ **DONE**
- [x] Create `server/src/modules/notifications/notifications.service.ts` — ✅ **DONE**

#### Step 3: Integrate activity creation into existing flows

- [x] **Invite service**: Create `INVITE_RECEIVED` on workspace invite — ✅ **DONE**
- [x] **Channel creation**: Create `CHANNEL_CREATED` / `MEMBER_JOINED` — ✅ **DONE**
- [x] **Invite acceptance**: Create `INVITE_ACCEPTED` — ✅ **DONE**
- [x] **Do NOT** integrate with socket dispatcher for messages — ✅ **Respected** (no message notifications created)

#### Step 4: Activity API endpoints

- [x] `GET /notifications` — ✅ **DONE**
- [x] `GET /notifications/unread-count` — ✅ **DONE**
- [x] `PATCH /notifications/:id/read` — ✅ **DONE**
- [x] `PATCH /notifications/read-all` — ✅ **DONE**

#### Step 5: Socket event for real-time activity delivery

- [x] Add `NOTIFICATION_NEW: "notification:new"` to `SOCKET_EVENTS` — ✅ **DONE** (constants exist in both client and server)
- [x] When a notification is created, emit to `user:{userId}` room — ✅ **DONE**
- [x] Payload: the full `Notification` object — ✅ **DONE** (client handler expects it)

### Phase 2: Client — Activity Feed

#### Step 6: Notification API client

- [x] Create `client/src/modules/notifications/api/notifications.api.ts` — ✅ **DONE**
  - `getNotifications(cursor?)` — ✅ **DONE**
  - `getUnreadCount()` — ✅ **DONE**
  - `markAsRead(id)` — ✅ **DONE**
  - `markAllAsRead()` — ✅ **DONE**
  - `getPreferences()` / `updatePreferences()` — ✅ **DONE** (for settings page)
  - `subscribePush()` / `unsubscribePush()` — ✅ **DONE** (for Phase 3)

#### Step 7: Notification hooks

- [x] `useNotifications()` — ✅ **DONE** (infinite query, subscribes to `notification:new`)
- [x] `useUnreadCount()` — ✅ **DONE** (poll + real-time via socket)
- [x] `useMarkAsRead()` / `useMarkAllAsRead()` — ✅ **DONE**
- [x] `useNotificationPreferences()` — ✅ **DONE** (for settings page)

#### Step 8: Activity feed page

- [x] Create `client/src/app/(protected)/notifications/page.tsx` — ✅ **DONE**
- [x] Route: `/notifications` — ✅ **DONE**
- [x] Layout: full-page with activity items — ✅ **DONE**
- [x] Each item shows icon, title, body, timestamp, read/unread indicator — ✅ **DONE**
- [x] Click → navigate to link + mark as read — ✅ **DONE**
- [x] "Mark all as read" button in header — ✅ **DONE**
- [x] Infinite scroll pagination — ✅ **DONE**
- [x] Empty state: "No activity yet" — ✅ **DONE**

#### Step 9: Notification types and rendering

- [x] Create `notifications-ui.tsx` utility — ✅ **DONE** (timeAgo, NotificationIcon mapping)

| Type | Icon | Title format | Body | Status |
|---|---|---|---|---|
| `INVITE_RECEIVED` | `Mail` | `Workspace invite` | `You've been invited to {workspaceName}` | ✅ **DONE** |
| `INVITE_ACCEPTED` | `UserCheck` | `{username} joined` | `{username} accepted your invite to {workspaceName}` | ✅ **DONE** |
| `MEMBER_JOINED` | `UserPlus` | `New member` | `{username} joined #{channelName}` | ✅ **DONE** |
| `CHANNEL_CREATED` | `Hash` | `New channel` | `#{channelName} was created in {workspaceName}` | ✅ **DONE** |

### Phase 2.5: Client — Bell Icon Popover

#### Step 10: Bell icon component

- [x] Create `BellPopover.tsx` — ✅ **DONE**
- [x] Bell icon (`Bell` from lucide-react) with unread badge count — ✅ **DONE**
- [x] Uses `useUnreadCount()` for the badge — ✅ **DONE**
- [x] On click: opens a dropdown/popover — ✅ **DONE**
- [x] Popover shows recent 10 activity items, each with icon/title/body/timestamp — ✅ **DONE**
- [x] Click item → navigate + mark as read — ✅ **DONE**
- [x] "View all" link → navigates to `/notifications` — ✅ **DONE**
- [x] "Mark all as read" action — ✅ **DONE**
- [x] Close on click outside or Escape — ✅ **DONE**

#### Step 11: Integrate bell into header

- [x] Bell popover + theme toggle integrated into `AppLayoutShell.tsx` — ✅ **DONE**
- [x] Minimal top bar with bell icon, badge, and theme toggle — ✅ **DONE**

#### Step 12: Socket handler for `notification:new`

- [x] Create `handleNotificationNew` — ✅ **DONE**
- [x] Appends to activity cache (React Query) — ✅ **DONE**
- [x] Increments unread count for bell badge — ✅ **DONE**
- [x] Registered in `eventRouter.ts` and `useGlobalSocket.ts` — ✅ **DONE**
- [x] Does NOT trigger desktop notification for activity items — ✅ **DONE** (only desktop notifs for messages)

### Phase 2: Mentions (Future)

- [ ] Parse `@username` in messages and create `MENTION` activity item
- [ ] Add `MENTION` to `NotificationType` enum
- [ ] Desktop notification for mentions when tab is hidden

---

### Phase 3: Web Push Notifications (Detailed Plan)

> **Goal:** Deliver push notifications via the Web Push API (Service Worker + VAPID) so users get notified of activity events and new messages even when the browser window is closed.

#### Phase 3 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (Client)                      │
│                                                          │
│  ┌──────────────────────┐     ┌──────────────────────┐   │
│  │   Next.js App (tab)   │     │   Service Worker      │   │
│  │                       │     │   (sw.js)             │   │
│  │  Socket.io (online)   │     │                       │   │
│  │  PushManager.subscribe│     │  push event listener  │   │
│  │  Send sub → API       │     │  notificationclick    │   │
│  └──────┬───────────────┘     └──────────┬────────────┘   │
│         │                                │                │
└─────────┼────────────────────────────────┼────────────────┘
          │           Browser Push Service (FCM/APNs/etc.)
          │                                │
┌─────────▼────────────────────────────────▼────────────────┐
│                     Server (Node.js)                       │
│                                                           │
│  ┌─────────────────────┐    ┌─────────────────────────┐   │
│  │  Notification Module │    │  Push Dispatcher        │   │
│  │                      │    │                         │   │
│  │  createAndDispatch() │───▶│  web-push.send()        │   │
│  │  - Creates DB record  │    │  for each subscription  │   │
│  │  - Emits socket event │    │  of the target user     │   │
│  │  - Fires push (new)   │    │                         │   │
│  └──────────────────────┘    └───────────┬─────────────┘   │
│                                          │                 │
│  ┌───────────────────────────────────────▼────────────────┐│
│  │  Database (PostgreSQL)                                 ││
│  │                                                         ││
│  │  PushSubscription { endpoint, p256dh, auth, userId }    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Two-Layer Delivery Strategy:**

| Layer | Mechanism | Works When | Use Case |
|---|---|---|---|
| **Socket** | `socket.io` emit to `user:{userId}` room | App tab is open | Real-time updates to bell badge + popover |
| **Web Push** | `web-push` library → Browser Push Service → Service Worker | Browser is closed / tab is hidden | Notifications that arrive regardless of app state |

**Design Principle:** Both layers fire for every notification. The Service Worker decides whether to show the notification based on whether the tab is open and actively viewing the relevant content.

---

#### Phase 3 Key Decisions

**3a. Separate PushSubscription from NotificationPreference**

| Model | Purpose |
|---|---|
| `PushSubscription` | Browser push endpoint + encryption keys. One per browser/device. |
| `NotificationPreference` | User-level settings: which notification types should trigger a push. |

**3b. Presence-Aware Push (Deferred to post-MVP)**

For MVP, **always send push** when a notification is created. Do not suppress pushes based on online status or conversation focus.

**3c. Push for Activity Events First, Messages Second**

| Priority | Notification Type | Push Behavior |
|---|---|---|
| P0 | Activity events (`INVITE_RECEIVED`, `INVITE_ACCEPTED`, `MEMBER_JOINED`, `CHANNEL_CREATED`) | Push on creation, regardless of online status |
| P1 | Message notifications (new message when tab is hidden) | Push when user is not in the conversation and tab is hidden |

**3d. VAPID Key Management**

```
VAPID_PUBLIC_KEY=...   (public — safe to expose to client)
VAPID_PRIVATE_KEY=...  (secret — server only)
VAPID_SUBJECT=mailto:admin@nexus.app
```

Generate with:
```bash
npx web-push generate-vapid-keys
```

**3e. No NotificationPreference Table (for now)**

Defer the `NotificationPreference` Prisma model. Start with client-side-localStorage toggles for:
- `pushEnabled` (boolean)
- `pushForMessages` (boolean)
- `pushForActivity` (boolean)

---

#### Phase 3.1: Infrastructure & VAPID Setup

**Steps:**

1. **Install `web-push` on server** — `cd server && npm install web-push`

2. **Generate VAPID key pair** — `npx web-push generate-vapid-keys --json`, add to `.env`

3. **Add VAPID env vars to `server/src/config/env.ts`**
   ```typescript
   VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!,
   VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
   VAPID_SUBJECT: process.env.VAPID_SUBJECT!,
   ```

4. **Create `server/src/services/push.service.ts`** — VAPID init, `sendPushNotification()`, `shouldPush()`
   - `initPushService()` — calls `webpush.setVapidDetails()` at server startup
   - `sendPushNotification(userId, payload)` — fetches subscriptions, sends to each, handles `410 Gone`

5. **Add push repository functions** to `notifications.repository.ts`
   - `savePushSubscription(userId, subscription, userAgent)` — upsert by endpoint
   - `getPushSubscriptionsByUserId(userId)` — get all subscriptions
   - `deletePushSubscription(endpoint)` — remove invalid subscription

6. **Add push subscription API endpoints**
   - `POST /notifications/push/subscribe` — save subscription
   - `DELETE /notifications/push/subscribe/:id` — remove subscription

---

#### Phase 3.2: Service Worker Registration & Push Subscription

**Steps:**

1. **Create `client/public/sw.js`** — Service Worker with handlers for:
   - `install` — `self.skipWaiting()`
   - `activate` — `clients.claim()`
   - `push` — parse payload, call `self.registration.showNotification()`
   - `notificationclick` — close notification, focus existing tab or open new one, navigate to URL
   - `pushsubscriptionchange` — re-subscribe and send new subscription to server

2. **Update `client/src/shared/lib/notifications.ts`**
   - Fix `registerServiceWorker()` path to `/sw.js`
   - Add `subscribeToPush()` — calls `pushManager.subscribe()` with VAPID public key
   - Add `unsubscribeFromPush()` — unsubscribes and calls unsubscribe API

3. **Add VAPID public key to client env**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

4. **Integrate subscription flow:**
   - When user grants permission AND `pushEnabled` → subscribe + send to API
   - On logout → unsubscribe + clean up on server

---

#### Phase 3.3: Push Delivery Logic

**Modify `createAndDispatch()` in `notifications.service.ts`:**

```typescript
export const createAndDispatch = async (input: CreateNotificationInput) => {
  const notification = await notificationsRepo.create({ ... });

  // 1. Socket delivery (existing) — real-time for open tabs
  try {
    const io = getIO();
    io.to(`user:${input.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  } catch (err) {
    console.error("[Notifications] Socket emit failed:", err);
  }

  // 2. Push delivery (new) — for closed tabs (fire-and-forget)
  sendPushNotification(input.userId, {
    title: notification.title,
    body: notification.body || undefined,
    url: notification.link || undefined,
    tag: notification.id,
  }).catch(err => console.error("[Notifications] Push send failed:", err));

  return notification;
};
```

---

#### Phase 3.4: Notification Preferences UI

**Steps:**

1. **Create `client/src/modules/notifications/utils/notification-preferences.ts`** — localStorage-backed preferences
   ```typescript
   interface NotificationPreferences {
     pushEnabled: boolean;
     notifyDMs: boolean;
     notifyChannels: boolean;
     notifyActivity: boolean;
   }
   ```

2. **Extend settings page** at `(protected)/settings/notifications/page.tsx` with:
   - Push Notifications toggle
   - Sub-toggles for DMs, channels, activity events
   - Reset to default button

3. **Wire preferences into push flow** — subscribe/unsubscribe based on toggle state

---

#### Phase 3.5: Message Push Notifications

**Design:**

| Scenario | Push? |
|---|---|
| User is viewing the conversation | ❌ No (they see it live) |
| User is viewing a different conversation | ✅ Yes (tag = conversationId for dedup) |
| User is in a different app / tab is hidden | ✅ Yes |
| User is offline (browser closed) | ✅ Yes (delivered on reconnect) |

**Implementation:**

1. **Track active conversation** via `conversation:focus` socket event → server-side `Map<userId, conversationId>`

2. **Modify `message.handler.ts`** — after creating and emitting message, iterate members and push to those not viewing the conversation

```typescript
async function dispatchMessagePush(message: Message, conversationId: string) {
  const members = await getConversationMemberIds(conversationId);
  for (const memberId of members) {
    if (memberId === message.userId) continue;
    const activeConv = activeConversations.get(memberId);
    if (activeConv === conversationId) continue;
    await sendPushNotification(memberId, {
      title: message.user.username,
      body: message.content,
      url: `/conversations/${conversationId}`,
      tag: conversationId,
    });
  }
}
```

---

#### Phase 3.6: Activity Event Push Notifications

Already handled by the modified `createAndDispatch()` — no additional changes needed.

| Event | Push Title | Push Body | Action URL |
|---|---|---|---|
| `INVITE_RECEIVED` | "Workspace invite" | "You've been invited to {workspaceName}" | `/invite?workspace={workspaceId}` |
| `INVITE_ACCEPTED` | "{username} joined" | "{username} accepted your invite to {workspaceName}" | `/workspaces/{workspaceId}` |
| `MEMBER_JOINED` | "New member" | "{username} joined the workspace" | `/workspaces/{workspaceId}` |
| `CHANNEL_CREATED` | "New channel" | "#{channelName} was created in {workspaceName}" | `/workspaces/{workspaceId}/channels/{channelId}` |

---

### Presence-Aware Delivery (Post-MVP Enhancement)

| User State | Action |
|---|---|
| User offline (no socket, no active tab) | Send push via web-push |
| User online, viewing OTHER conversation / page | Send push |
| User online, viewing THIS conversation / page | Skip push (they see it live) |
| User online, but tab is hidden | Send push (browser shows it as a native notification) |

**Implementation:**
1. Server-side presence tracking already exists (presenceStore + Redis)
2. Active conversation tracking via `conversation:focus` socket event
3. Combine both in a `shouldPush()` function

---

## Security & Edge Cases (Phase 3)

### Security

| Concern | Mitigation |
|---|---|
| VAPID private key exposure | Store in server env only. Never expose to client. |
| Stale push subscriptions | Catch `410 Gone` errors from `web-push`, delete from DB. |
| Push subscription endpoint misuse | Validate subscription belongs to authenticated user. |
| Notification spam | Client-side preferences control which notifications trigger a push. |

### Edge Cases

| Scenario | Handling |
|---|---|
| User clears browser data | Next page load detects existing permission but no subscription → re-subscribe. `410` on server also cleans up. |
| User revokes notification permission | `pushManager.subscribe()` will fail → catch error, update UI, disable push toggle. |
| Multiple devices | Each device has its own `PushSubscription` record. Server sends to all. |
| Push subscription expires | Browser emits `pushsubscriptionchange` event in Service Worker. Re-subscribe and update server. |
| User logs out | Call `unsubscribeFromPush()` on all subscriptions. |
| Rapid successive pushes to same tag | Browser shows only the latest notification for that tag (native dedup). |
| Large payload | Keep push payloads small (< 4KB). Use `data` field only for navigation URL + ID. |

---

## Data Flow

### Sending a workspace invite (internal)

```
Admin searches for user by username
  → POST /workspaces/:slug/invite { username }
  → Server finds user, creates Notification (type: INVITE_RECEIVED)
  → Server emits notification:new to user:{targetUserId}
  → (Phase 3) Server sends web push via Service Worker
  → Target user sees activity item in bell popover (or push notification)
  → Click → navigate to workspace join page
```

### Accepting an invite

```
User accepts invite (via link or inbox)
  → Server adds user to workspace
  → Server creates Notification (type: INVITE_ACCEPTED) for the inviter
  → Server emits notification:new to user:{inviterId}
  → (Phase 3) Server sends web push
  → Inviter sees activity item in bell popover (or push notification)
```

### New message → unread state (no notification created)

```
User sends message
  → Server creates message, emits message:new to conversation room
  → Recipient's client:
      → If viewing the conversation → message appears live
      → If NOT viewing the conversation:
          → Sidebar shows unread count (from lastReadMessageId)
          → No activity item created
          → If tab hidden: existing desktop notification fires
          → (Phase 3.5) Web push sent if not viewing the conversation
```

### Viewing unread conversations

```
User logs in
  → Fetch conversations with members
  → Compute unread counts from ConversationMember.lastReadMessageId
  → Show in sidebar:
      #general (12)
      DM Robin (3)
  → Bell badge is separate — counts only activity items
```

---

## UI Mockups (text)

### Header top bar (Step 11)

```
┌──────────────┬──────────────────────────────────────────┐
│              │ 🔔 [3]              🌙                  │
│  Navigation  │──────────────────────────────────────────│
│    Rail      │          Main Content Area                │
│              │                                           │
└──────────────┴──────────────────────────────────────────┘
```

The bell icon sits in the header bar alongside the theme toggle. No settings gear is shown in MVP (notification preferences are client-side only initially).

### Bell Popover

```
┌─────────────────────────────────┐
│ Activity                  View all│
│ ───────────────────────────────── │
│ 🔵 Robin accepted your invite    │
│    to Design Team                 │
│    2 min ago                      │
│ ───────────────────────────────── │
│ 🔵 Alex joined #frontend         │
│    15 min ago                     │
│ ───────────────────────────────── │
│ ⚪ Invite to Design Team          │
│    You've been invited to Design..│
│    2 hours ago                    │
│ ───────────────────────────────── │
│                           Mark all read│
└─────────────────────────────────┘
```

### Activity feed page (full)

```
┌──────────────────────────────────────────────┐
│  ← Back             Activity                  │
│                                      Mark read│
│ ───────────────────────────────────────────── │
│                                              │
│  🔵 Robin accepted your invite               │
│     to Design Team                            │
│     2 min ago                                │
│                                              │
│  🔵 Alex joined #frontend                    │
│     15 min ago                               │
│                                              │
│  ⚪ You were added to #design                │
│     by alex                                  │
│     2 hours ago                              │
│                                              │
│  ⚪ Invite to Design Team                    │
│     You've been invited to Design Team       │
│     [Accept] [Decline]                       │
│     5 hours ago                              │
│                                              │
│ ───────────────────────────────────────────── │
│  [Load more]                                  │
└──────────────────────────────────────────────┘
```

---

## File Changes Summary

### Server

| File | Change | Phase |
|---|---|---|
| `prisma/schema.prisma` | Add `Notification` model and `NotificationType` enum (no `MESSAGE` type). `PushSubscription` model kept. | 1 |
| `server/src/modules/notifications/notifications.repository.ts` | **New** — CRUD for notifications | 1 |
| `server/src/modules/notifications/notifications.service.ts` | **New** — notification creation + query logic | 1 |
| `server/src/modules/notifications/notifications.controller.ts` | **New** — activity feed + push subscription API endpoints | 1 |
| `server/src/modules/notifications/notifications.routes.ts` | **New** — route registration | 1 |
| `server/src/modules/notifications/notifications.schema.ts` | **New** — request validation | 1 |
| `server/src/shared/socket-events.ts` | Add `NOTIFICATION_NEW` event constant | 1 |
| `server/src/modules/invites/resolvers/workspaceResolver.ts` | Create `INVITE_RECEIVED` + `INVITE_ACCEPTED` notifications | 1 |
| `server/src/app.ts` | Register notification routes | 1 |
| `server/package.json` | Add `web-push` dependency | 3.1 |
| `server/.env` | Add VAPID keys | 3.1 |
| `server/src/config/env.ts` | Add VAPID env variables | 3.1 |
| `server/src/server.ts` | Call `initPushService()` at startup | 3.1 |
| `server/src/services/push.service.ts` | **New** — VAPID init, `sendPushNotification()`, `shouldPush()` | 3.1 |
| `server/src/modules/notifications/notifications.repository.ts` | Add push subscription CRUD | 3.1 |
| `server/src/modules/notifications/notifications.service.ts` | Extend `createAndDispatch()` with push | 3.3 |
| `server/src/modules/messages/messages.service.ts` | Add push dispatch for new messages | 3.5 |

**Notably NOT changed:**
- `server/src/socket/socket.dispatcher.ts` — no message notification creation

### Client

| File | Change | Phase |
|---|---|---|
| `client/src/modules/notifications/api/notifications.api.ts` | **New** — API client | 2 |
| `client/src/modules/notifications/hooks/useNotifications.ts` | **New** — query hooks | 2 |
| `client/src/modules/notifications/components/BellPopover.tsx` | **New** — bell icon + dropdown | 2 |
| `client/src/app/(protected)/notifications/page.tsx` | **New** — activity feed page | 2 |
| `client/src/socket/handlers/notification.handlers.ts` | **New** — `handleNotificationNew` | 2 |
| `client/src/socket/eventRouter.ts` | Register notification handler | 2 |
| `client/src/modules/chat/hooks/useGlobalSocket.ts` | Register `notification:new` event | 2 |
| `client/src/modules/notifications/components/AppLayoutShell.tsx` | Add header top bar with bell icon | 2 |
| `client/src/config/url.ts` | Add notification API routes + activity feed + settings app routes | 2 |
| `client/public/sw.js` | **New** — Service Worker with push + notificationclick handlers | 3.2 |
| `client/.env` | Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 3.2 |
| `client/src/config/env.ts` | Add VAPID public key env variable | 3.2 |
| `client/src/shared/lib/notifications.ts` | Fix SW path, add subscribe/unsubscribe functions | 3.2 |
| `client/src/modules/notifications/utils/notification-preferences.ts` | **New** — localStorage preferences | 3.4 |
| `client/src/app/(protected)/settings/notifications/page.tsx` | Add push toggle section | 3.4 |
| `client/src/socket/socketClient.ts` | Add `conversation:focus` emit helper | 3.5 |

---

## Verification Plan (Phase 3)

### Manual Testing

1. **Service Worker registration:** Open DevTools → Application → Service Workers. Confirm `/sw.js` is registered.
2. **Push subscription:** After granting notification permission, check that `POST /notifications/push/subscribe` is called with the subscription object.
3. **Push delivery:** Send an invite to a user. Close all browser tabs. Verify the notification appears on desktop.
4. **Notification click:** Click the notification. Verify it navigates to the correct URL and focuses the app.
5. **Expired subscription:** Manually delete a subscription from the DB. Trigger a push. Verify the server deletes the stale record on `410`.
6. **Multiple devices:** Subscribe on two browsers. Send one notification. Verify both receive it.

### Automated Testing

| Test | Scope |
|---|---|
| Push service sends notification with valid subscription | Unit |
| Push service handles `410 Gone` gracefully | Unit |
| Push service skips invalid subscriptions | Unit |
| `createAndDispatch()` calls both socket emit and push send | Integration |
| Client registers Service Worker on permission grant | E2E |

---

## Future Considerations (NOT for MVP)

- **Mentions (`@user`)** — Phase 2: parse mentions in messages and create `MENTION` notification
- **Presence-aware push suppression** — Post-Phase 3: only push when user is offline or not viewing the content
- **NotificationPreference Prisma model** — Post-Phase 3: server-side sync of preferences across devices
- **Push notification sounds** — Post-Phase 3
- **Do Not Disturb scheduling** — Post-Phase 3
- **Notification retention/cleanup** — periodic job to delete notifications older than 90 days
- **In-app notification sounds** — configurable sound per notification type
- **Notification snoozing** — "Do not disturb" mode with schedule
- **Email fallback for push** — Future
- **Firebase Cloud Messaging for native mobile** — Future
- **Mobile push** — via Firebase Cloud Messaging for native mobile apps
- **Batch push delivery (coalesce multiple notifications)** — Future

---

## Design Decisions (pre-decided)

### Two separate systems: Unread messages vs Activity

Unread messages and activity notifications are **two completely separate systems**:

| | Unread messages | Activity |
|---|---|---|
| Source | `ConversationMember.lastReadMessageId` | `Notification` table |
| Display | Sidebar: `#general (12)` | Bell badge + popover + activity feed page |
| Types | DMs + channels | invites, joins, channel events, mentions |
| Persistence | Computed on-the-fly | Explicit rows |
| Cleaning | No cleanup needed | Periodic retention cleanup |

This is the model used by Slack and Discord — it scales much better and avoids turning the notifications table into a copy of the messages table.

### No notification backfill

On socket connect or login, **do not** generate activity items from unread messages. The `lastReadMessageId` field already captures unread state. Backfill introduces:
- Duplication (messages already read elsewhere)
- Race conditions (concurrent socket connections)
- Cleanup complexity (removing stale items)

### Notification permission prompt

Desktop notification permission is user-controlled from a simple client-side toggle, not enforced server-side.

When push is added (Phase 3), add:
```
Enable Push Notifications
```
toggle that drives push subscription.

### Presence-aware delivery (Phase 3.5+)

For push notifications:

| User state | Action |
|---|---|
| User offline (no socket) | Send push |
| User online, viewing OTHER conversation | Send push |
| User online, viewing THIS conversation | No push (they see it live) |
| User online, viewing this conversation but tab is hidden | Send push via `notification:new` socket event |

### Invite-to-user flow

Two invite methods coexist:
- **Link-based invites** (existing): For external sharing — generate a link, share it anywhere
- **User-based invites** (new): For internal invites — search by username, sends an inbox notification

---

## Migration / Rollback (Phase 3)

### Data Migration

No migration needed. The `PushSubscription` model already exists in the schema.

### Rollback Plan

1. Remove `NEXT_PUBLIC_VAPID_PUBLIC_KEY` from client env
2. Remove VAPID keys from server env
3. Revert `createAndDispatch()` to socket-only
4. Delete `server/src/services/push.service.ts`
5. Delete `client/public/sw.js`
6. Remove `POST/DELETE push/subscribe` routes

<!-- End of plan -->
