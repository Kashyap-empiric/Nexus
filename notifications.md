# Notifications & Inbox — Implementation Plan

> **Status:** Analysis phase. No code changes yet.
>
> **Architecture review applied.** See `notes` source for full review context.

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

The `PushSubscription` model is correct and should stay. It's needed for push notifications in a later phase.

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
| **Phase 3** | Push notifications + Notification preferences + Service Worker + VAPID keys |
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

// Phase 3:
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

### 3. Push notifications strategy (two layers) — Phase 3+

**Layer 1: Socket-based (existing, enhanced)** — Works while the app has an active socket connection
- Already works via `handleMessageNew` (fires when tab is hidden)
- The existing desktop notification for new messages stays (it's a browser notification, not the activity inbox)
- Phase 1: activity items delivered via `notification:new` socket event to update the bell badge in real-time
- Phase 1: no desktop notifications for activity items — just badge + popover

**Layer 2: Service Worker Push — implementation path** — Works when app is closed entirely
- Deferred to Phase 3

**MVP progression:**
1. **Activity feed + bell** (Phase 1) — covers invites, joins, channel events
2. **Mentions** (Phase 2) — `@user` generates activity items
3. **Push notifications** (Phase 3) — Service Worker + `NotificationPreference` + VAPID
4. **Advanced routing** (Phase 4)

---

## Implementation Steps

### Phase 1: Backend — Activity Infrastructure

#### Step 1: Database migration

- [ ] Add `Notification` model and `NotificationType` enum to Prisma schema (no `MESSAGE` type)
- [ ] Run migration
- [ ] Add `@@index([userId, read, createdAt])` for fast inbox queries
- [ ] Do **NOT** add `NotificationPreference` model yet

#### Step 2: Notification repository and service

- [ ] Create `server/src/modules/notifications/notifications.repository.ts`
  - `createNotification(params)` → insert row
  - `getNotifications(userId, cursor?, limit?)` → paginated activity feed
  - `markAsRead(notificationId, userId)` → single notification
  - `markAllAsRead(userId)` → bulk mark read
  - `getUnreadCount(userId)` → badge count
- [ ] Create `server/src/modules/notifications/notifications.service.ts`
  - Thin wrapper, mostly delegates to repository

#### Step 3: Integrate activity creation into existing flows

- [ ] **Invite service** (`invites.service.ts`): When a workspace invite is sent to a specific user by username:
  - Creates a `Notification` with type `INVITE_RECEIVED` for the target user
    - `title`: "Workspace invitation"
    - `body`: "You've been invited to {workspaceName} by {inviterName}"
    - `link`: `/invite?token={token}`
    - `metadata`: `{ workspaceId, workspaceName, inviterId, inviterName, token }`
  - Emits `notification:new` to `user:{targetUserId}`
  - Keeps existing link-based invites intact (external sharing still works)
  
- [ ] **Channel creation**: When a new channel is created (public or private), create `CHANNEL_CREATED` or `MEMBER_JOINED` notifications for relevant users

- [ ] **Invite acceptance**: When a user accepts a workspace invite, create an `INVITE_ACCEPTED` notification for the user who created the invite

- [ ] **Do NOT** integrate with socket dispatcher (`socket.dispatcher.ts`) — message notifications are not created

#### Step 4: Activity API endpoints

- [ ] `GET /notifications` — paginated activity feed (cursor-based)
- [ ] `GET /notifications/unread-count` — badge count
- [ ] `PATCH /notifications/:id/read` — mark one as read
- [ ] `PATCH /notifications/read-all` — mark all as read

#### Step 5: Socket event for real-time activity delivery

- [ ] Add `NOTIFICATION_NEW: "notification:new"` to `SOCKET_EVENTS`
- [ ] When a notification is created, emit to `user:{userId}` room
- [ ] Payload: the full `Notification` object

### Phase 2: Client — Activity Feed

#### Step 6: Notification API client

- [ ] Create `client/src/modules/notifications/api/notifications.api.ts`
  - `getNotifications(cursor?)`
  - `getUnreadCount()`
  - `markAsRead(id)`
  - `markAllAsRead()`

#### Step 7: Notification hooks

- [ ] `useNotifications()` — fetches paginated activity feed, subscribes to `notification:new` socket event
- [ ] `useUnreadCount()` — fetches and maintains unread count, subscribes to real-time updates

#### Step 8: Activity feed page

- [ ] Create `client/src/app/(protected)/notifications/page.tsx`
- [ ] Route: `/notifications`
- [ ] Layout: full-page with activity items
- [ ] Each item shows:
  - Icon (invite: mail, join: user-plus, channel: hash, etc.)
  - Title + body preview
  - Relative timestamp ("2 min ago", "yesterday")
  - Read/unread indicator (dot or background)
  - Click → navigate to `link` + mark as read
- [ ] "Mark all as read" button in header
- [ ] Infinite scroll pagination
- [ ] Empty state: "No activity yet"

#### Step 9: Notification types and rendering

Create a mapping of `NotificationType → display properties`:

| Type | Icon | Title format | Body |
|---|---|---|---|
| `INVITE_RECEIVED` | `Mail` | `Workspace invite` | `You've been invited to {workspaceName}` |
| `INVITE_ACCEPTED` | `UserCheck` | `{username} joined` | `{username} accepted your invite to {workspaceName}` |
| `MEMBER_JOINED` | `UserPlus` | `New member` | `{username} joined #{channelName}` |
| `CHANNEL_CREATED` | `Hash` | `New channel` | `#{channelName} was created in {workspaceName}` |

### Phase 3: Client — Bell Icon Popover

#### Step 10: Bell icon component

- [ ] Create `BellPopover.tsx` in `client/src/modules/notifications/components/`
- [ ] Bell icon (`Bell` from lucide-react) with unread badge count
- [ ] Uses `useUnreadCount()` for the badge
- [ ] On click: opens a dropdown/popover
- [ ] Popover shows:
  - Recent 10 activity items (scrollable)
  - Each item: icon, title, body, timestamp, read/unread dot
  - Click item → navigate + mark as read
  - "View all" link → navigates to `/notifications` (full activity feed page)
  - "Mark all as read" action at bottom
- [ ] Popover max height with overflow scroll
- [ ] Close on click outside or Escape

#### Step 11: Integrate bell into header

- [ ] Add a minimal **top bar** above the main content area in `AppLayoutShell.tsx`:
  ```
  ┌──────────────┬─────────────────────────────────────┐
  │              │ 🔔 [3]    🌙                    ☰  │
  │  Navigation  │─────────────────────────────────────│
  │    Rail      │       Main Content Area              │
  │              │                                      │
  └──────────────┴─────────────────────────────────────┘
  ```
- [ ] The top bar contains: bell icon with badge, theme toggle
- [ ] The header bar should be minimal — just enough height for the icon row (40-44px)

#### Step 12: Socket handler for `notification:new`

- [ ] Create `handleNotificationNew` in `client/src/socket/handlers/notification.handlers.ts`
- [ ] When a new notification arrives via socket:
  - Append to the activity cache (React Query)
  - Increment the unread count (bell badge)
- [ ] Register in `eventRouter.ts` and `useGlobalSocket.ts`
- [ ] Do **NOT** trigger a desktop notification for activity items (they're low-urgency; desktop alerts are reserved for new messages, which already works)

### Phase 2: Mentions (Future)

- [ ] Parse `@username` in messages and create `MENTION` activity item
- [ ] Add `MENTION` to `NotificationType` enum
- [ ] Desktop notification for mentions when tab is hidden

### Phase 3: Push + Preferences (Future)

- [ ] Add `NotificationPreference` model
- [ ] Service Worker registration
- [ ] VAPID key generation
- [ ] Push subscription API
- [ ] `web-push` integration

---

## Data Flow

### Sending a workspace invite (internal)

```
Admin searches for user by username
  → POST /workspaces/:slug/invite { username }
  → Server finds user, creates Notification (type: INVITE_RECEIVED)
  → Server emits notification:new to user:{targetUserId}
  → Target user sees activity item in bell popover
  → Click → navigate to workspace join page
```

### Accepting an invite

```
User accepts invite (via link or inbox)
  → Server adds user to workspace
  → Server creates Notification (type: INVITE_ACCEPTED) for the inviter
  → Server emits notification:new to user:{inviterId}
  → Inviter sees activity item in bell popover
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
          → If tab hidden: existing desktop notification fires (keeps existing behavior)
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

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Notification` model and `NotificationType` enum (no `MESSAGE` type). `PushSubscription` model kept. `NotificationPreference` **deferred**. |
| `server/src/modules/notifications/notifications.repository.ts` | **New** — CRUD for notifications |
| `server/src/modules/notifications/notifications.service.ts` | **New** — notification creation + query logic |
| `server/src/modules/notifications/notifications.controller.ts` | **New** — activity feed + push subscription API endpoints |
| `server/src/modules/notifications/notifications.routes.ts` | **New** — route registration |
| `server/src/modules/notifications/notifications.schema.ts` | **New** — request validation |
| `server/src/shared/socket-events.ts` | Add `NOTIFICATION_NEW` event constant |
| `server/src/modules/invites/invites.service.ts` | Create `INVITE_RECEIVED` notification when workspace invite is sent to specific user |
| `server/src/app.ts` | Register notification routes |

**Notably NOT changed:**
- `server/src/socket/socket.dispatcher.ts` — no message notification creation

### Client

| File | Change |
|---|---|
| `client/src/modules/notifications/api/notifications.api.ts` | **New** — API client (no preferences/subscribe for MVP) |
| `client/src/modules/notifications/hooks/useNotifications.ts` | **New** — query hooks |
| `client/src/modules/notifications/components/BellPopover.tsx` | **New** — bell icon + dropdown |
| `client/src/app/(protected)/notifications/page.tsx` | **New** — activity feed page |
| `client/src/socket/handlers/notification.handlers.ts` | **New** — `handleNotificationNew` |
| `client/src/socket/eventRouter.ts` | Register notification handler |
| `client/src/modules/chat/hooks/useGlobalSocket.ts` | Register `notification:new` event |
| `client/src/modules/notifications/components/AppLayoutShell.tsx` | Add header top bar with bell icon |
| `client/src/config/url.ts` | Add notification API routes + activity feed + settings app routes |

**Notably NOT changed in Phase 1:**
- Notification settings page (`/settings/notifications`) — deferred
- `NotificationPreference` API — deferred
- Push subscription API — deferred

---

## Future Considerations (NOT for MVP)

- **Mentions (`@user`)** — Phase 2: parse mentions in messages and create `MENTION` notification
- **Push notifications** — Phase 3: Service Worker + VAPID + `web-push`
- **NotificationPreference** — Phase 3: per-type toggles stored on server
- **Notification retention/cleanup** — periodic job to delete notifications older than 90 days
- **In-app notification sounds** — configurable sound per notification type
- **Notification snoozing** — "Do not disturb" mode with schedule
- **Mobile push** — via Firebase Cloud Messaging for native mobile apps

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

Initial MVP:
- Browser's native permission prompt on first trigger
- No settings page needed
- The existing `requestNotificationPermission()` call in `SocketProvider` is sufficient

When push is added (Phase 3), add:
```
Enable Push Notifications
```
toggle that drives `NotificationPreference.pushEnabled`.

### Presence-aware delivery (Phase 3+)

For push notifications (not Phase 1):

| User state | Action |
|---|---|
| User offline (no socket) | Send push |
| User online, viewing OTHER conversation | Send push |
| User online, viewing THIS conversation | No push (they see it live) |
| User online, viewing this conversation but tab is hidden | Send push via `notification:new` socket event |

This avoids the common annoyance of getting a push for something you're already reading.

### Invite-to-user flow

Two invite methods coexist:
- **Link-based invites** (existing): For external sharing — generate a link, share it anywhere
- **User-based invites** (new): For internal invites — search by username, sends an inbox notification

Add `POST /workspaces/:slug/members` with `{ username }` body.

<!-- End of plan -->
