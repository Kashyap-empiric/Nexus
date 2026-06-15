# Notifications Module — End-to-End Documentation

## Overview

The notifications module provides a real-time notification system that supports:
- In-app notifications (bell icon popover + full notifications page)
- Desktop push notifications (via Service Worker + Notification API)
- Web push subscriptions (for mobile Chrome/Android)

Notifications cover workspace invites, invite acceptances, new channel creations, and new member joins.

---

## Data Model

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String           // Recipient user ID
  type      NotificationType // Enum: INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED
  title     String           // Short title: "Workspace invite", "New member", etc.
  body      String?          // Descriptive body text
  link      String?          // Clickable URL destination
  imageUrl  String?          // Optional thumbnail/avatar
  read      Boolean          @default(false)
  metadata  Json?            // Flexible payload with entity IDs, names, etc.
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Notification Types

| Type | Trigger | Title | Body Example | Link | Metadata |
|------|---------|-------|-------------|------|----------|
| `INVITE_RECEIVED` | User invited to workspace | "Workspace invite" | "You've been invited to Acme by Jane" | `/invite?token=...` | workspaceId, workspaceName, inviterId, inviterName |
| `INVITE_ACCEPTED` | Invited user joins workspace | "johndoe joined" | "johndoe accepted your invite to Acme" | `/workspaces/.../channels/...` | workspaceId, workspaceName, joinerId, joinerName |
| `MEMBER_JOINED` | New member via invite link | "New member" | "johndoe joined the workspace" | `/workspaces/.../channels/...` | workspaceId, workspaceName, joinerId, joinerName |
| `CHANNEL_CREATED` | New channel created | "New channel" | "#general was created in Acme" | `/workspaces/.../channels/...` | channelId, channelName, workspaceId, workspaceName, creatorId |

---

## Architecture

```
┌──────────┐    HTTP POST     ┌──────────────────┐    Prisma    ┌──────────┐
│  Client  │ ◄──────────────► │   Server (HTTP)   │ ◄─────────► │ Postgres │
│ (React)  │                  │  notifications.*  │             │ (notif)  │
└────┬─────┘                  └────────┬─────────┘             └──────────┘
     │                                 │
     │ Socket.IO (real-time)           │ createAndDispatch()
     ▼                                 ▼
┌──────────┐                  ┌──────────────────┐
│ Socket   │ ◄──────────────► │   Socket Server   │
│ Client   │   event:         │  io.to(userId)    │
│          │  "notification:  │  .emit(...)       │
│          │   new"           └──────────────────┘
└────┬─────┘
     │
     ▼
┌──────────┐
│ Browser  │ (via Service Worker Notification API)
│ Desktop  │
│ Notif.   │
└──────────┘
```

### Flow: Creating a Notification

1. Any server module calls `createAndDispatch()` from `notifications.service.ts`
2. The service:
   a. **Persists** the notification to the database
   b. **Emits** a Socket.IO event `notification:new` to the recipient's room
3. If the sender has a push subscription, the combined notification is also sent via `push.service.ts`

### Flow: Receiving a Notification (Client)

1. **Socket handler** (`notification.handlers.ts`): On `notification:new`:
   - Prepend notification to React Query cache
   - Increment unread count
   - If tab is hidden (`document.hidden`), show a desktop notification
2. **In-app UI**: `BellPopover` and `NotificationsPage` display cached data via `useNotifications()` hook
3. **Click action**: Each notification has a `link` property — clicking navigates to the destination (e.g., invite page, workspace channel)

### Flow: Invite Notifications (Critical Path)

1. **Inviter** calls `POST /workspaces/:id/invite` or `POST /workspaces/:id/invite-multiple`
2. Server generates an invite token via `generateInviteService()` and stores it in the `Invite` table
3. Server creates an `INVITE_RECEIVED` notification with `link: /invite?token=<token>`
4. Recipient sees the notification in the bell popover
5. **Clicking** navigates to `/invite?token=...`
6. `InviteProcessor` component:
   - If authenticated: resolves the token via `POST /invites/resolve` and redirects to workspace
   - If unauthenticated: stores token in `sessionStorage` and redirects to `/login`
7. After login, `AuthGate` calls `handleInviteContinuation()` which reads the stored token and resolves it

---

## API Endpoints

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications (cursor-based pagination) |
| `GET` | `/notifications/unread-count` | Get unread notification count |
| `PATCH` | `/notifications/:id/read` | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |
| `GET` | `/notifications/preferences` | Get user notification preferences |
| `PUT` | `/notifications/preferences` | Update notification preferences |
| `POST` | `/notifications/push/subscribe` | Subscribe to web push |
| `DELETE` | `/notifications/push/subscribe` | Unsubscribe from web push |

### Invites (Notification-adjacent)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/invites/generate` | Generate an invite token |
| `POST` | `/invites/resolve` | Resolve an invite token (joins workspace) |
| `POST` | `/workspaces/:id/invite` | Invite single user by username or email |
| `POST` | `/workspaces/:id/invite-multiple` | Batch invite multiple users by userIds |

---

## Client-Side Architecture

### Key Files

| File | Purpose |
|------|---------|
| `client/src/modules/notifications/api/notifications.api.ts` | API functions for CRUD operations |
| `client/src/modules/notifications/hooks/useNotifications.ts` | React Query hooks (`useNotifications`, `useUnreadCount`, `useMarkAsRead`, etc.) |
| `client/src/modules/notifications/components/BellPopover.tsx` | Header bell icon + dropdown with recent notifications |
| `client/src/app/(protected)/notifications/page.tsx` | Full notifications page with infinite scroll |
| `client/src/modules/notifications/utils/notifications-ui.tsx` | Utility functions (`timeAgo`, `NotificationIcon`) |
| `client/src/modules/notifications/types/notification.ts` | TypeScript types |
| `client/src/socket/handlers/notification.handlers.ts` | Real-time socket event handler |
| `client/src/shared/lib/notifications.ts` | Desktop Notification API wrapper |

### Data Flow

1. **Initial load**: `useNotifications()` (infinite query) fetches paginated notifications
2. **Real-time updates**: Socket handler appends new notifications to cache
3. **Unread count**: `useUnreadCount()` polls every 30s + real-time socket updates
4. **Marking read**: `useMarkAsRead()` optimistically updates cache, then invalidates queries

---

## Push Notifications

### Web Push Flow

1. User grants `Notification.permission`
2. Service Worker registers (`/sw.js`)
3. Browser push subscription sent to server via `POST /notifications/push/subscribe`
4. When a notification is created, `push.service.ts` iterates all subscriptions for the user and sends push via Web Push API
5. On mobile Chrome/Android, the Service Worker handles the push event and shows a notification
6. On desktop, the Notification API fires `onclick` which navigates to the notification's link URL

### Subscription Storage

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique @db.Text
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
}
```

---

## Error Handling & Edge Cases

- **Duplicate notifications**: The system does not prevent duplicate notifications — each invite creates a separate notification
- **Expired invites**: The invite token validation occurs at resolution time; expired tokens show an error message
- **Already a member**: If a user tries to accept an invite while already a member, `onboardUserToWorkspaceInTransaction` gracefully ignores the duplicate via Prisma's `P2002` error handling
- **Notification link broken**: If the link points to a deleted resource, the user sees a generic error via `InviteProcessor` which redirects to home
- **Concurrent resolution**: The `consumeInviteAtomicInTransaction` function uses a raw SQL atomic update to prevent double-acceptance
