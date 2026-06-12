# Nexus Workspace — Analysis & Implementation Plan

## Project Overview

Nexus is a real-time chat application (Slack/Discord-like) built with:
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Socket.IO client, TanStack Query
- **Backend:** Express.js, Prisma (PostgreSQL), Socket.IO, Redis (presence tracking)
- **Auth:** Supabase

The app supports **Direct Messages (DMs)** and **Workspace Channels**. Workspaces contain members, and within each workspace there are channels (conversations). The NavigationRail switches between DM mode and workspace mode.

---

## Issue 1: Message Read Icon Not Working in Channels

### Current Behavior

The `MessageStatus` component in `client/src/modules/messages/components/MessageStatus.tsx`:
- Pending messages → clock icon
- Read messages (`partnerLastReadMessageId >= messageId`) → double blue checkmark (`CheckCheck`)
- Otherwise → single checkmark (`Check`)

The problem is that `partnerLastReadMessageId` is only passed for **DMs**, not for channels.

**Root cause in `ActiveConversation.tsx` (line ~144-146):**
```tsx
const otherMember = isDM ? conversation.members.find((m) => m.userId !== currentUserId) : undefined;
// ...
partnerLastReadMessageId={otherMember?.lastReadMessageId}
```

Since `otherMember` is `undefined` for channels, `partnerLastReadMessageId` is always `undefined` in channels, so the double blue checkmark never shows.

### What Needs to Change

**Approach: For channels, show a "read by X" indicator when at least one other member has read the message.**

1. **`ActiveConversation.tsx`** — For channels, compute which members have read past each sent message. Pass channel members' `lastReadMessageId` data down to `MessageList`.

2. **`MessageList.tsx`** — Accept a new prop, e.g., `channelLastReadMessageIds: Record<string, string | null>` (memberId → their lastReadMessageId), and pass it to `MessageGroupItem`.

3. **`MessageGroupItem.tsx`** — For the current user's messages in a channel, compute how many other members have `lastReadMessageId >= messageId`. Show:
   - `"Read by N"` tooltip/text next to the message status
   - The double checkmark when at least one other person has read it

4. **Server (`conversations.repository.ts`)** — Ensure the `findById` and `findChannelByWorkspaceId` queries include `lastReadMessageId` for all members (they already do).

5. **Stronger sorting fix for `MessageStatus.tsx`** — The current comparison `messageId <= partnerLastReadMessageId` uses string comparison on UUIDv7 IDs (which are time-sortable), but this can be fragile. Use a proper timestamp-based comparator or ensure UUIDv7 sorting consistency.

**Files to modify:**
- `client/src/modules/messages/components/MessageStatus.tsx`
- `client/src/modules/messages/components/MessageGroupItem.tsx`
- `client/src/modules/messages/components/MessageList.tsx`
- `client/src/modules/chat/components/ActiveConversation.tsx`
- `client/src/modules/workspaces/hooks/useWorkspaceChannels.ts` (if we need to refetch members)

---

## Issue 2: Member List (Discord-Style)

### Current State

- Presence tracking is implemented (Redis-based, socket events for online/offline)
- `PresenceIndicator.tsx` shows a green/gray dot on avatars
- Workspace details API (`GET /workspaces/:id`) returns members with user data
- Workspace members are fetched but not displayed in a dedicated member list view

### What Needs to Build

**A "Members" panel that shows all workspace members, separated by online/offline status.**

1. **New Component: `MemberListSidebar.tsx`**
   - Located in `client/src/modules/workspaces/components/`
   - Shows when user clicks a "Members" button in the workspace header
   - Displays members grouped by:
     - **Online** (currently connected) — friends/dot in green
     - **Offline** (not connected) — grayed out
   - Each member shows: avatar, username, role badge (OWNER/ADMIN/MEMBER)
   - Real-time presence updates (via existing socket events)

2. **Integration with workspace sidebar**
   - Add a "Members" toggle/header section in the workspace sidebar (below "Channels", above the user profile)
   - The number of online members shown as a badge
   - Clicking opens the member list

3. **API: Create dedicated workspace members endpoint** (or use existing workspace details)
   - `GET /workspaces/:id/members` → returns members with user data
   - Already partially available via `GET /workspaces/:id` which includes members

**Files to create/modify:**
- `client/src/modules/workspaces/components/MemberList.tsx` (NEW)
- `client/src/modules/workspaces/components/WorkspaceHeader.tsx` (add Members button)
- `client/src/modules/conversations/components/Sidebar.tsx` (add members section in workspace mode)
- `client/src/modules/workspaces/api/workspaces.api.ts` (optional: add members fetch)
- `server/src/modules/workspaces/workspaces.routes.ts` (optional: add members endpoint)

### Design Notes (Discord-Style)
- Sidebar panel (not a modal), similar to Discord's member list on the right side
- Or, an expandable section in the existing sidebar below "Channels"
- Real-time presence updates: when a user comes online/goes offline, the list updates live
- Role badges with colored dots: Owner (red), Admin (blue), Member (gray)

---

## Issue 3: In-App Notification System

### Current State

- Desktop browser notifications work (via `Notification API`)
- When tab is hidden and a message arrives, it shows a desktop notification
- The notification navigates to the conversation on click
- No in-app notification panel, bell icon, or dedicated inbox view
- No notification history store

### What Needs to Build

#### 3a. Notification Data Model & Store

**Server-side:**
- New Prisma model for notifications:
  ```prisma
  model Notification {
    id             String   @id
    userId         String
    type           String   // "NEW_MESSAGE", "INVITE", "MENTION", "CHANNEL_INVITE"
    title          String
    body           String   // message preview
    conversationId String?
    workspaceId    String?
    senderId       String?
    isRead         Boolean  @default(false)
    createdAt      DateTime @default(now())

    user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
    sender User?  @relation("NotificationSender", fields: [senderId], references: [id])
    
    @@index([userId, isRead])
    @@index([userId, createdAt])
  }
  ```

- New socket event: `notification:new`
- When a message is created, if the recipient is not currently viewing the conversation, create a notification and emit it

**Client-side:**
- New notification store (Zustand): `useNotificationStore`
  - Stores notification list
  - Unread count
  - Methods: fetch, markRead, markAllRead

#### 3b. Bell Icon in Header (Popover)

- **Location:** `ActiveConversation.tsx` header bar (next to theme toggle)
- **Icon:** `Bell` from lucide-react
- **Badge:** Shows unread notification count
- **Popover:** Uses existing `Popover` UI component
  - Lists recent notifications (last 20)
  - Each notification shows: sender avatar, message preview, time ago
  - Click marks as read and navigates to the conversation
  - "Mark all as read" button
  - Uses `client/src/shared/components/ui/popover.tsx`

#### 3c. Inbox Icon in Navigation Rail

- **Location:** `NavigationRail.tsx` — Add an `Inbox` icon button
- **Behavior:** Clicking opens a dedicated notifications page (like Discord's Inbox view)
- **Route:** `/inbox` (new route)
- **Page:** Lists ALL notifications with filters:
  - All
  - Unread
  - Mentions
  - Filter by conversation/channel
- Supports pagination (infinite scroll)

#### 3d. Notification Creation Logic

**Server-side (`messages.service.ts` or a new notification service):**
- After creating a message, determine who needs to be notified:
  - For DMs: notify the other user
  - For channels: notify all channel members except the sender
  - Only notify if the user is not currently viewing the conversation (check via socket rooms)
- Create notification in DB
- Emit `notification:new` via socket to each recipient's `user:<userId>` room

**Files to create/modify:**
- `server/prisma/schema.prisma` (add Notification model + migration)
- `server/src/modules/notifications/` (NEW folder with service, controller, routes, types)
- `server/src/shared/socket-events.ts` (add `NOTIFICATION_NEW`)
- `server/src/socket/socket.dispatcher.ts` (add notification dispatch)
- `server/src/modules/messages/messages.service.ts` (create notification after message send)
- `client/src/modules/notifications/` (NEW folder with store, hooks, components, API)
- `client/src/modules/chat/components/ActiveConversation.tsx` (add bell icon)
- `client/src/modules/chat/components/NavigationRail.tsx` (add inbox icon)
- `client/src/app/(protected)/inbox/` (NEW route + page)
- `client/src/shared/socket-events.ts` (add client event)

---

## Issue 4: Channel Separation in Sidebar (Public vs Private)

### Current State

- Channels in workspace mode are shown as a flat list
- No visual distinction between public and private channels
- The `isPrivate` field already exists on the `Conversation` model

### What Needs to Change

1. **`CreateChannelModal.tsx`** — Add a toggle/radio to select channel type:
   - Public Channel (default) — visible to all workspace members, auto-joins all
   - Private Channel — only visible to selected members, requires invitation
   - Currently, all channels are created as public (`isPrivate: false`)

2. **`Sidebar.tsx`** — Filter channels into two groups:
   - **Public Channels** header — shows `# channel-name` for each public channel
   - **Private Channels** header — shows 🔒 `channel-name` for each private channel
   - Collapsible sections (optional, nice-to-have)

3. **`useWorkspaceChannels.ts`** — Ensure the query returns `isPrivate` field (already does, included in `Conversation` type)

**Files to modify:**
- `client/src/modules/conversations/components/Sidebar.tsx`
- `client/src/modules/workspaces/components/CreateChannelModal.tsx`
- `server/src/modules/workspaces/workspaces.service.ts` (allow creating private channels)

---

## Additional Suggestions & Observations

### A. CreateChannelModal Navigation Bug
The `CreateChannelModal` redirects to `/conversations/${channel.id}` on success, but workspace channels should redirect to `/workspaces/${slug}/channels/${channel.id}`. Fix this to navigate correctly.

### B. Channel Route URL Fix
The workspace channel page route `workspaces/[slug]/channels/[channelId]` uses the workspace slug as `activeWorkspaceId`, but the `CreateChannelModal` uses the workspace ID (UUID). This can cause mismatches in the sidebar. Need to ensure consistency.

### C. "Mark as Read" for Channels
Currently, `markConversationAsRead` only updates `lastReadMessageId` for a specific user. For channels, when you view a channel, it should:
- Mark your own `lastReadMessageId` (already works)
- Emit `message:read` to notify others you've read their messages (already works)
- Visibility: These events should be shown for the sender's messages in the channel

### D. Backfill Slug Migration
The `scripts/backfill-slugs.ts` script suggests slugs are being added to existing workspaces. Ensure slugs are stable and URLs are bookmarkable.

### E. Optimistic Channel Creation
Newly created channels should appear in the sidebar instantly without polling. Currently the workspace channels query polls every 5 seconds (`refetchInterval: 5000`). Consider using socket events for channel creation instead.

### F. Workspace Member Off-boarding
When a user leaves a workspace, they should be removed from all channel member lists and their socket should leave the workspace room.

---

## Implementation Order (Recommended)

1. **Quick fixes first** — Channel separation in sidebar (Issue 4) + CreateChannelModal navigation fix (Suggestion A)
2. **Read receipt fix** (Issue 1) — Affects current functionality, relatively contained change
3. **Member list** (Issue 2) — Adds visible value, leverages existing presence infra
4. **Notification system** (Issue 3) — Largest feature, builds on everything else

---

## File Change Summary

| Issue | Server Files | Client Files | New Files |
|-------|-------------|-------------|-----------|
| #1 Read icon | None | `ActiveConversation.tsx`, `MessageList.tsx`, `MessageGroupItem.tsx`, `MessageStatus.tsx` | None |
| #2 Member list | None (existing endpoint) | `Sidebar.tsx`, `WorkspaceHeader.tsx` | `MemberList.tsx` |
| #3 Notifications | `schema.prisma`, `messages.service.ts`, new notification module, `socket-events.ts`, `socket.dispatcher.ts` | `ActiveConversation.tsx`, `NavigationRail.tsx`, `socket-events.ts` | Notification store, API, components, `/inbox` page |
| #4 Channel separation | `workspaces.service.ts` | `Sidebar.tsx`, `CreateChannelModal.tsx` | None |
