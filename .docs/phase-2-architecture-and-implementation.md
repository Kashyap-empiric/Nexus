# Nexus Phase 2 — Architecture & Implementation Plan

> **Status:** Draft Plan
> **Last Updated:** 2026-06-11
> **Covers:** Workspaces · Channels (public/private) · Reactions · Notifications · User Profiles · Invite Inbox
> **Prerequisites:** Phase 1 complete. Race condition in `deleteMessage`, soft-delete leakage, and pagination ordering fixed. `editMessage` non-transactional reads still outstanding.

---

## Table of Contents

1. [Current Architecture Assessment](#1-current-architecture-assessment)
2. [Feature Architecture](#2-feature-architecture)
   - [2.1 Workspaces](#21-workspaces)
   - [2.2 Channels](#22-channels)
   - [2.3 User Profiles](#23-user-profiles)
   - [2.4 Reactions](#24-reactions)
   - [2.5 Notifications System](#25-notifications-system)
   - [2.6 Invite Inbox](#26-invite-inbox)
3. [Database Schema Design](#3-database-schema-design)
4. [Socket Events & Real-Time Architecture](#4-socket-events--real-time-architecture)
5. [REST API Specification](#5-rest-api-specification)
6. [Client Architecture & Routing](#6-client-architecture--routing)
7. [State Management Strategy](#7-state-management-strategy)
8. [Implementation Phases](#8-implementation-phases)
9. [Migration Strategy](#9-migration-strategy)
10. [Open Questions & Decisions](#10-open-questions--decisions)

---

## 1. Current Architecture Assessment

### What Exists Today

```
User ─── ConversationMember ─── Conversation ─── Message
  │                                  │
  │                           type: "DM" | "CHANNEL" (only DM used)
  │                           workspaceId: String? (unused, no FK)
  │                           isPrivate: true
  │
  └─── Invite (type: USER | CONVERSATION | WORKSPACE | CHANNEL)
       • WORKSPACE resolver → throws NOT_IMPLEMENTED
       • CHANNEL resolver  → throws NOT_IMPLEMENTED
       • 24h active-link rotation, atomic consumption
```

### Key Leverage Points

| Asset | How It Helps Phase 2 |
|---|---|
| `Conversation.type` enum | Already supports `DM` and `CHANNEL` — channels need zero schema changes for the conversation model itself |
| `Conversation.workspaceId` | Already exists on the model but lacks a FK relation to a `Workspace` table — just needs the relation defined |
| `Conversation.isPrivate` | Already exists — maps directly to public/private channel semantics |
| `Invite` system + resolvers | Polymorphic resolver pattern (`userResolver`, `conversationResolver`) is tested and ready to extend for `workspaceResolver` and `channelResolver` |
| `socket.dispatcher.ts` | Typed dispatch helpers can be extended with workspace/channel/reaction events |
| `PresenceIndicator` + `onlineUsers` | Existing presence system works for channel members too |
| `ConversationMember.lastReadMessageId` | Read receipts work for channels out of the box |
| `Message` model + services | Send, edit, delete, paginate — all work for channel conversations |

### Gaps to Fill

| Gap | Impact |
|---|---|
| No `Workspace` or `WorkspaceMember` models | Core container for channels doesn't exist |
| No `Reaction` model | Emoji reactions cannot be persisted |
| No `workspaceId` FK on `Conversation` | Channels can't be scoped to a workspace with referential integrity |
| No notification system | Users receive no alerts for mentions, invites, or channel activity |
| No invite inbox | Invites are only link-based — no way to see pending invites |
| `User` model lacks `displayName` and `bio` | Profiles are just username + avatar |
| No `workspace` room joining | Server doesn't auto-join users to workspace rooms |

---

## 2. Feature Architecture

### 2.1 Workspaces

#### Concept

Workspaces are the top-level organizational unit. A workspace contains channels and members. Users can belong to multiple workspaces.

#### Role Hierarchy

| Role | Permissions |
|---|---|
| **OWNER** | Full control: delete workspace, transfer ownership, change any role, remove any member, all admin permissions |
| **ADMIN** | Manage channels (create/delete/update), manage members (add/remove/change roles except owner), workspace settings |
| **MEMBER** | View and join public channels, view channels they're members of, send messages, invite others (if workspace allows) |

#### Membership Rules

- A user must be a WorkspaceMember to see the workspace exists
- A user must be a WorkspaceMember to see the workspace's channel list
- A user must be a ConversationMember (channel member) to access private channel content
- Leaving a workspace removes all channel memberships automatically (cascade)

#### Key Design Decisions

1. **Workspace invites use the existing invite system** — `type: WORKSPACE` with `workspaceResolver.ts` implementation
2. **Workspace list is fetched on app load** — lightweight query, cached aggressively
3. **Workspace switching changes the visible channel set** — doesn't disconnect socket or trigger full reload
4. **Default workspace** — users are prompted to create one on first login (onboarding)

### 2.2 Channels (Public & Private)

#### Concept

Channels are conversations within a workspace. They reuse the existing `Conversation` model with `type: CHANNEL`.

#### Public Channels

- Visible to all workspace members in the channel list
- Any workspace member can join without invitation
- Messages, history, and members are visible to all members
- Join via clicking the channel name or a "Join" button

#### Private Channels

- Only visible to members who have been added
- Not listed for non-members (they don't appear in the sidebar at all)
- Membership is managed by channel admins (or workspace admins)
- Invite-only via the invite system (`type: CHANNEL`)

#### Channel Properties

| Property | Type | Description |
|---|---|---|
| `name` | String | Display name (e.g., "general", "engineering") |
| `topic` | String? | Optional description shown in channel header |
| `isPrivate` | Boolean | Public (false) or Private (true) |
| `memberCount` | Computed | Count of ConversationMember records |

#### Key Design Decisions

1. **Channels reuse Conversation model** — `type: CHANNEL`, `workspaceId` FK. All existing message infrastructure works: send, edit, delete, read receipts, real-time delivery, pagination.
2. **Channel name uniqueness** — enforced at the service layer (not DB constraint) within a workspace scope. Names are lowercase, alphanumeric with hyphens (Slack-style).
3. **Channel membership is separate from workspace membership** — a user must be in the workspace to see public channels, but must explicitly join (or be added to) private channels.
4. **Archiving** — channels can be archived (not deleted) to preserve history. Implemented via a `archivedAt` field on Conversation.

### 2.3 User Profiles

#### Concept

Extend the existing `User` model with richer profile fields and create a profile management system.

#### Profile Fields

| Field | Type | Editable | Source |
|---|---|---|---|
| `username` | String | Yes | Unique, alphanumeric |
| `displayName` | String? | Yes | Shown in UI, falls back to username |
| `bio` | String? | Yes | Short biography (0-500 chars) |
| `avatarUrl` | String? | Yes | Supabase Storage URL |
| `email` | String | No | From Supabase Auth |

#### Profile Visibility

- **Public:** username, displayName, avatarUrl, bio — visible to all authenticated users
- **Private:** email, account creation date — visible only to the profile owner

#### Key Design Decisions

1. **Profiles use `PATCH /api/profiles/me`** — simple update endpoint, no full user CRUD needed
2. **Avatar upload uses Supabase Storage** — store in `avatars/{userId}` bucket, signed URLs for access
3. **Real-time profile updates** — emit `user:profile-updated` via socket to all user rooms so avatars/names update in-place

### 2.4 Reactions

#### Concept

Emoji reactions on messages. Users can add or remove emoji reactions on any message they can see.

#### Data Model

```prisma
model Reaction {
  id        String   @id
  emoji     String
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])  // One reaction per user per emoji per message
  @@index([messageId])                  // Fast lookup for message reactions
}
```

#### Key Design Decisions

1. **Toggle semantics** — look up existing reaction (same messageId + userId + emoji). If exists → delete (removed). If not → create (added). This is a lookup-then-delete-or-create pattern, not an upsert, so the server knows which socket event to broadcast.
2. **Reactions are fetched with messages** — `getMessages` includes `reactions` with user data in the Prisma query. No separate API call needed per message.
3. **Real-time broadcast** — `reaction:added` / `reaction:removed` events broadcast to the conversation room.
4. **No emoji validation on the backend** — trust the client. The emoji-picker-react library already constrains input to valid emojis. Store the raw emoji character.

### 2.5 Notifications System

#### Concept

A lightweight notification system that tracks unread activity across conversations and allows users to see what they've missed. This is intentionally **not** a push notification system — those belong in Phase 3.

#### Notification Types

| Type | Trigger | Storage |
|---|---|---|
| **New message in channel** | `message:new` in a channel the user hasn't read | Computed via unreadCount (existing) |
| **@mention** | Message containing `@username` | `UserNotification` table |
| **Invite to workspace/channel** | Invite created | `UserNotification` table |
| **Member joined channel** | User added to private channel | `UserNotification` table |
| **Reaction to your message** | `reaction:added` on user's message | `UserNotification` table |

#### Data Model

```prisma
enum NotificationType {
  MESSAGE           // New message in channel (existing unreadCount handles this)
  MENTION           // @username mention
  INVITE            // Workspace or channel invite
  MEMBER_ADDED      // Added to a private channel
  REACTION          // Someone reacted to your message
}

model UserNotification {
  id              String           @id
  userId          String
  type            NotificationType
  title           String           // Short title (e.g., "New message in #general")
  body            String?          // Optional preview text
  referenceType   String?          // "conversation", "workspace", "invite"
  referenceId     String?          // ID of the referenced entity
  metadata        Json?            // Flexible payload (actorId, emoji, etc.)
  isRead          Boolean          @default(false)
  createdAt       DateTime         @default(now())

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([userId, createdAt])
}
```

#### Key Design Decisions

1. **Hybrid approach** — lightweight notifications (invites, mentions, reactions) are persisted in `UserNotification` table. Unread message counts continue to be computed dynamically (existing `unreadCount` logic).
2. **Socket events for real-time delivery** — when a notification is created, emit `notification:new` to the user's `user:{userId}` room. The client shows a badge or toast.
3. **Invite notifications** — when someone creates a workspace or channel invite for a user, a `UserNotification` with type `INVITE` is created and emitted via socket.
4. **No email/push notifications** — out of scope for Phase 2. These require background jobs (BullMQ) and are Phase 3 concerns.
5. **Notification center UI** — accessible via a bell icon in the navigation rail. Shows a paginated list of recent notifications. Clicking a notification navigates to the relevant conversation/workspace.
6. **Mention detection** — server-side parsing of message content for `@username` patterns on `message:send` / `POST /messages`. Create `UserNotification` for each mentioned user who is a member of the conversation.

### 2.6 Invite Inbox

#### Concept

A centralized place where users can see and manage their pending invites. Currently, invites are only processed via direct link (`/invite?token=...`). The invite inbox adds an in-app UI for discovering and acting on invites.

#### Data Flow

```
Invite Created
  │
  ├─→ Existing flow: invite link copied and shared externally
  │     └─→ Recipient opens link → /invite?token=... → resolves
  │
  └─→ NEW: invite inbox flow
        ├─→ Server creates UserNotification (type: INVITE)
        ├─→ Server emits notification:new to user:{userId} room
        ├─→ Client shows badge on bell icon
        └─→ User opens notification center → sees pending invite
              ├─→ Click "Accept" → POST /api/invites/resolve { token }
              └─→ Click "Decline" → DELETE /api/notifications/:id
```

#### Implementation Approach

Rather than building a separate invite inbox UI, **leverage the notification system**:

- Invites generate a `UserNotification` with `type: INVITE`
- The notification card shows: "Alice invited you to join 'Engineering' workspace"
- The notification card has two actions: **Accept** (calls resolve) and **Dismiss** (marks notification as read)
- The notification center (bell icon dropdown) serves as the invite inbox
- Additionally, the invite link flow continues to work for external sharing

#### Token Resolution

When a user clicks Accept on an invite notification:
1. The client needs the invite token (stored in `UserNotification.metadata.token`)
2. Calls `POST /api/invites/resolve { token }` — existing endpoint
3. On success, the redirect URL is followed, notification is marked as read
4. Socket events fire normally (conversation:new, CONVERSATION_UPDATE, workspace:member-added, etc.)

---

## 3. Database Schema Design

### Prisma Schema Changes

```prisma
// === NEW MODELS ===

model Workspace {
  id        String            @id
  name      String
  slug      String            @unique
  avatarUrl String?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  members       WorkspaceMember[]
  conversations Conversation[]
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}

model WorkspaceMember {
  id          String        @id
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId, workspaceId])
}

model Reaction {
  id        String   @id
  emoji     String
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}

enum NotificationType {
  MENTION
  INVITE
  MEMBER_ADDED
  REACTION
}

model UserNotification {
  id              String           @id
  userId          String
  type            NotificationType
  title           String
  body            String?
  referenceType   String?          // "conversation", "workspace", "invite"
  referenceId     String?          // ID of the referenced entity
  metadata        Json?            // Flexible payload
  isRead          Boolean          @default(false)
  createdAt       DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([userId, createdAt])
}

// === EXISTING MODEL MODIFICATIONS ===

// User — add profile fields
model User {
  // ... existing fields (id, email, username, avatarUrl, createdAt, updatedAt)
  displayName String?
  bio         String?

  // NEW relations
  workspaceMemberships WorkspaceMember[]
  notifications        UserNotification[]
  reactions            Reaction[]
}

// Conversation — add workspace FK + archivedAt
model Conversation {
  // ... existing fields
  workspaceId String?   // Already exists, now with proper FK

  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
  archivedAt  DateTime?  // For channel archiving
}

// Message — add reactions relation
model Message {
  // ... existing fields
  reactions Reaction[]
}
```

### Migration Steps

1. Add new models: `Workspace`, `WorkspaceMember`, `Reaction`, `UserNotification`
2. Add `displayName String?` and `bio String?` to `User`
3. Add explicit `workspace Workspace?` relation to `Conversation` (field already exists)
4. Add `archivedAt DateTime?` to `Conversation`
5. Add `reactions Reaction[]` to `Message`
6. Run `npx prisma migrate dev --name add_phase2_models`

### Indexing Strategy

| Index | Table | Purpose |
|---|---|---|
| `@@unique([workspaceId, userId])` | WorkspaceMember | Prevent duplicate workspace membership |
| `@@index([userId, workspaceId])` | WorkspaceMember | Fast lookup of user's workspaces |
| `@@unique([messageId, userId, emoji])` | Reaction | One reaction per user per emoji |
| `@@index([messageId])` | Reaction | Fast load all reactions for a message |
| `@@index([userId, isRead, createdAt])` | UserNotification | Notification center queries |

---

## 4. Socket Events & Real-Time Architecture

### New Socket Events

| Direction | Event | Payload | Source | When |
|---|---|---|---|---|
| **S → C** | `workspace:new` | `{ workspace }` | `workspaces.controller.ts` | Workspace created |
| **S → C** | `workspace:update` | `{ workspace }` | `workspaces.controller.ts` | Workspace settings updated |
| **S → C** | `workspace:delete` | `{ workspaceId }` | `workspaces.controller.ts` | Workspace deleted |
| **S → C** | `workspace:member-added` | `{ workspaceId, userId, role }` | `workspaces.controller.ts` | Member added/joined |
| **S → C** | `workspace:member-removed` | `{ workspaceId, userId }` | `workspaces.controller.ts` | Member removed/left |
| **S → C** | `channel:new` | `{ conversation }` | `channels.controller.ts` | Channel created in workspace |
| **S → C** | `channel:update` | `{ conversation }` | `channels.controller.ts` | Channel settings updated |
| **S → C** | `channel:delete` | `{ conversationId }` | `channels.controller.ts` | Channel archived/deleted |
| **S → C** | `channel:member-joined` | `{ conversationId, userId, username }` | `channels.controller.ts` | User joined public channel |
| **S → C** | `channel:member-left` | `{ conversationId, userId }` | `channels.controller.ts` | User left channel |
| **S → C** | `channel:member-added` | `{ conversationId, userId, addedBy }` | `channels.controller.ts` | User added to private channel |
| **S → C** | `channel:member-removed` | `{ conversationId, userId }` | `channels.controller.ts` | User removed from channel |
| **S → C** | `reaction:added` | `{ messageId, emoji, userId, username }` | `reactions.controller.ts` | Emoji reaction added to message |
| **S → C** | `reaction:removed` | `{ messageId, emoji, userId }` | `reactions.controller.ts` | Emoji reaction removed |
| **S → C** | `user:profile-updated` | `{ userId, username, avatarUrl, displayName }` | `profiles.controller.ts` | User updated their profile |
| **S → C** | `notification:new` | `{ notification }` | `notifications.service.ts` | New notification created |

### Updated Room Strategy

| Room Pattern | Purpose | Joined When |
|---|---|---|
| `conversation:{id}` | Messages, reactions, read receipts, typing (existing) | On connect (auto-join all member conversations) |
| `user:{userId}` | Targeted notifications, new conversations, profile updates (existing) | On connect |
| `workspace:{workspaceId}` | **NEW** — Workspace-level broadcasts (channel create/delete, member changes) | On connect (auto-join for all user's workspaces) |

### Socket Dispatcher Extensions

Add to `socket.dispatcher.ts`:

```typescript
// Workspace events
dispatchWorkspaceNew(workspace)              // io.to("workspace:{id}").emit("workspace:new", ...)
dispatchWorkspaceUpdate(workspaceId, data)   // io.to("workspace:{id}").emit("workspace:update", ...)
dispatchWorkspaceDelete(workspaceId)         // io.to("workspace:{id}").emit("workspace:delete", ...)
dispatchWorkspaceMemberAdded(workspaceId, userId, role)
dispatchWorkspaceMemberRemoved(workspaceId, userId)

// Channel events
dispatchChannelNew(workspaceId, conversation)
dispatchChannelUpdate(conversationId, data)
dispatchChannelDelete(conversationId)
dispatchChannelMemberJoined(conversationId, userId, username)
dispatchChannelMemberLeft(conversationId, userId)
dispatchChannelMemberAdded(conversationId, userId, addedBy)
dispatchChannelMemberRemoved(conversationId, userId)

// Reaction events
dispatchReaction(messageId, action, payload)  // action: "added" | "removed"

// Profile events
dispatchProfileUpdated(userId, profileData)

// Notification events
dispatchNotification(userId, notification)
```

### Socket.ts Room Joining Extension

Extend `server/src/socket/socket.ts` to also join workspace rooms:

```typescript
// After joining conversation rooms, also join workspace rooms
const workspaceMemberships = await prisma.workspaceMember.findMany({
  where: { userId },
  select: { workspaceId: true },
});
const workspaceRooms = workspaceMemberships.map(
  (m) => `workspace:${m.workspaceId}`
);
if (workspaceRooms.length > 0) {
  await socket.join(workspaceRooms);
}
```

---

## 5. REST API Specification

### 5.1 Workspaces Module (`/api/workspaces`)

| Method | Route | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET` | `/api/workspaces` | Yes | List user's workspaces | None |
| `GET` | `/api/workspaces/:id` | Yes + Member | Workspace details + member list | None |
| `POST` | `/api/workspaces` | Yes | Create workspace (creator = OWNER) | `workspace:new` |
| `PATCH` | `/api/workspaces/:id` | Yes + Admin | Update name, slug, avatar | `workspace:update` |
| `DELETE` | `/api/workspaces/:id` | Yes + Owner | Delete workspace | `workspace:delete` |
| `GET` | `/api/workspaces/:id/members` | Yes + Member | List members with roles | None |
| `POST` | `/api/workspaces/:id/members` | Yes + Admin | Add member to workspace | `workspace:member-added`, `notification:new` |
| `PATCH` | `/api/workspaces/:id/members/:userId` | Yes + Admin | Change member role | `workspace:member-added` |
| `DELETE` | `/api/workspaces/:id/members/:userId` | Yes + Admin | Remove member | `workspace:member-removed` |
| `POST` | `/api/workspaces/:id/join` | Yes | Join via invite (bypasses normal member add) | `workspace:member-added` |
| `POST` | `/api/workspaces/:id/leave` | Yes + Member | Leave workspace, cascade-removes channel memberships | `workspace:member-removed` |

### 5.2 Channels Module (`/api/workspaces/:id/channels`)

| Method | Route | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET` | `/api/workspaces/:id/channels` | Yes + WS Member | List channels (public: all, private: member-only) | None |
| `GET` | `/api/workspaces/:id/channels/:channelId` | Yes + Member | Channel details + member list | None |
| `POST` | `/api/workspaces/:id/channels` | Yes + WS Admin | Create channel (Conversation with type=CHANNEL) | `channel:new` |
| `PATCH` | `/api/workspaces/:id/channels/:channelId` | Yes + WS Admin | Update name, topic, isPrivate | `channel:update` |
| `DELETE` | `/api/workspaces/:id/channels/:channelId` | Yes + WS Admin | Archive channel (sets `archivedAt`) | `channel:delete` |
| `POST` | `/api/workspaces/:id/channels/:channelId/join` | Yes + WS Member | Join public channel | `channel:member-joined` |
| `POST` | `/api/workspaces/:id/channels/:channelId/leave` | Yes + Member | Leave channel | `channel:member-left` |
| `POST` | `/api/workspaces/:id/channels/:channelId/members` | Yes + Channel Admin | Add members to private channel | `channel:member-added`, `notification:new` |
| `DELETE` | `/api/workspaces/:id/channels/:channelId/members/:userId` | Yes + Channel Admin | Remove member from private channel | `channel:member-removed` |

### 5.3 Profiles Module (`/api/profiles`)

| Method | Route | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET` | `/api/profiles/:userId` | Yes | Get public profile (username, displayName, avatarUrl, bio) | None |
| `PATCH` | `/api/profiles/me` | Yes | Update own profile (username, displayName, bio) | `user:profile-updated` |
| `POST` | `/api/profiles/me/avatar` | Yes | Upload avatar image (to Supabase Storage) | `user:profile-updated` |

### 5.4 Reactions Module (`/api/messages/:messageId/reactions`)

| Method | Route | Auth | Description | Socket Events |
|---|---|---|---|---|
| `POST` | `/api/messages/:messageId/reactions` | Yes + Member | Toggle reaction (add/remove) | `reaction:added` / `reaction:removed` |

Note: Reactions are fetched as part of `GET /api/conversations/:id/messages` — the messages response includes a `reactions` array.

### 5.5 Notifications Module (`/api/notifications`)

| Method | Route | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET` | `/api/notifications` | Yes | List recent notifications (paginated, newest first) | None |
| `GET` | `/api/notifications/unread-count` | Yes | Get unread notification count | None |
| `PATCH` | `/api/notifications/:id/read` | Yes | Mark single notification as read | None |
| `PATCH` | `/api/notifications/read-all` | Yes | Mark all notifications as read | None |
| `DELETE` | `/api/notifications/:id` | Yes | Delete a notification (for declined invites) | None |

### 5.6 Modified Existing Endpoints

| Method | Route | Change |
|---|---|---|
| `GET` | `/api/conversations` | Add optional `workspaceId` query param to filter DMs by workspace context |
| `GET` | `/api/conversations/:id/messages` | Include `reactions` in the response (with user data) |
| `GET` | `/api/me` | Include `profile` data (displayName, bio) |

---

## 6. Client Architecture & Routing

### Route Structure

```
/ (landing page — existing)

/(auth)
  /login                    (existing)
  /register                 (existing)
  /forgot-password          (existing)
  /auth/callback            (existing — OAuth)

/invite?token=             (existing — invite link processing)

/(protected)
  /conversations            (existing — DM list + empty state)
  /conversations/[id]       (existing — DM conversation view)

  /profile                  (NEW — profile page)
  /profile/edit             (NEW — edit profile form)

  /notifications            (NEW — notification center)

  /workspace/[workspaceId]  (NEW — workspace layout)
    /workspace/[workspaceId]/channel/[channelId]  (NEW — channel view)
    /workspace/[workspaceId]/members              (NEW — member management)
    /workspace/[workspaceId]/settings             (NEW — workspace settings)
```

### New Module Structure

```
client/src/modules/
├── auth/             (existing — no major changes)
├── chat/             (existing — extend for channels)
├── users/            (existing — extend with profiles)
├── landing/          (existing)
│
├── workspace/        (NEW)
│   ├── api/
│   │   └── workspaces.api.ts
│   ├── hooks/
│   │   ├── useWorkspaces.ts
│   │   ├── useWorkspace.ts
│   │   └── useWorkspaceMembers.ts
│   ├── components/
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── WorkspaceSidebar.tsx
│   │   ├── WorkspaceCreateModal.tsx
│   │   ├── WorkspaceSettingsModal.tsx
│   │   ├── WorkspaceHeader.tsx
│   │   ├── ChannelList.tsx
│   │   ├── ChannelListItem.tsx
│   │   ├── ChannelHeader.tsx
│   │   ├── CreateChannelModal.tsx
│   │   ├── ChannelMemberList.tsx
│   │   └── MemberList.tsx
│   ├── store/
│   │   └── workspaceStore.ts
│   └── types/
│       └── workspace.ts
│
├── notifications/    (NEW)
│   ├── api/
│   │   └── notifications.api.ts
│   ├── hooks/
│   │   └── useNotifications.ts
│   ├── components/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationList.tsx
│   │   └── NotificationCard.tsx
│   └── types/
│       └── notification.ts
│
└── onboarding/       (NEW — optional)
    ├── components/
    │   └── OnboardingWizard.tsx
    └── hooks/
        └── useOnboarding.ts
```

### Component Hierarchy

```mermaid
flowchart TD
    AppLayout["(protected)/layout.tsx"]
    NavRail["NavigationRail\n(workspace switcher, bell icon,\nprofile, theme toggle)"]
    SocketProvider["SocketProvider"]
    WSSidebar["WorkspaceSidebar\n(channel list, DM section)"]
    OldSidebar["Sidebar\n(DM-only, used when\nno workspace context)"]
    ChannelView["ChannelRoute\n(ChannelHeader + MessageList +\nMessageInput)"]
    DMView["ActiveConversation\n(DM view)"
    Empty["EmptyState\n(no conversation selected)"]
    NotificationCenter["NotificationList"]

    AppLayout --> SocketProvider
    AppLayout --> NavRail
    NavRail --> NotificationCenter
    AppLayout --> WSSidebar
    AppLayout --> OldSidebar
    AppLayout --> ChannelView
    AppLayout --> DMView
    AppLayout --> Empty
```

### Layout Decision

**Option A: Workspace-focused layout** (recommended)

The sidebar shows the workspace switcher at the top, followed by the channel list. The DM section is below channels. When the user is not in a workspace context, fall back to the existing DM-only sidebar.

```
┌──────────┬────────────┬──────────────────────────┐
│  Nav     │  Workspace │  Channel View             │
│  Rail    │  Sidebar   │                           │
│          │            │  #general                  │
│  [WS 1]  │  #general  │  [ChannelHeader]           │
│  [WS 2]  │  #random   │                           │
│          │  #dev      │  [MessageList]              │
│  [Bell]  │  ────────  │                           │
│  [User]  │  DMs       │  [MessageInput]             │
│          │  ────────  │                           │
│          │  Alice     │                           │
│          │  Bob       │                           │
└──────────┴────────────┴──────────────────────────┘
```

**Option B: Tab-based layout** (simpler but less discoverable)

Navigation rail has tabs for "Workspaces" and "Messages". Workspace view is a separate page, not a sidebar.

I recommend **Option A** because it mirrors Slack's proven UX pattern and lets users see both channels and DMs simultaneously.

### Key Routing Rules

1. `/workspace/[workspaceId]` redirects to the first channel in that workspace (or shows a "no channels" empty state)
2. `/conversations` continues to work as the DM-only view
3. The navigation rail shows workspace icons for quick switching
4. Channel view reuses `MessageList`, `MessageInput`, and the existing real-time message infrastructure

---

## 7. State Management Strategy

### Zustand Stores

#### workspaceStore.ts (NEW)

```typescript
interface WorkspaceState {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  setActiveWorkspace: (id: string | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  clearAll: () => void;
}
```

#### Extend chatStore.ts (EXISTING)

```typescript
interface UiState {
  // Existing
  socketStatus: "connecting" | "connected" | "disconnected";
  activeConversationId: string | null;
  drafts: Map<string, string>;
  onlineUsers: Set<string>;
  
  // NEW
  unreadNotifications: number;  // Count from notification center
  notificationList: Notification[];  // Cached for quick access
  
  // NEW Actions
  setUnreadNotifications: (count: number) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
}
```

### TanStack Query Keys

Extend `queryKeys.ts`:

```typescript
export const queryKeys = {
  // Existing
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", id] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  usersSearch: (query: string) => ["users", "search", query] as const,
  
  // NEW
  workspaces: ["workspaces"] as const,
  workspace: (id: string) => ["workspaces", id] as const,
  workspaceMembers: (id: string) => ["workspaces", id, "members"] as const,
  workspaceChannels: (workspaceId: string) => ["workspaces", workspaceId, "channels"] as const,
  channel: (channelId: string) => ["channels", channelId] as const,
  channelMembers: (channelId: string) => ["channels", channelId, "members"] as const,
  notifications: ["notifications"] as const,
  notificationUnreadCount: ["notifications", "unread-count"] as const,
  profile: (userId: string) => ["profiles", userId] as const,
  myProfile: ["profiles", "me"] as const,
};
```

### Socket Cache Integration (Extend `useGlobalSocket.ts`)

```typescript
// NEW events to handle in useGlobalSocket:
[SOCKET_EVENTS.WORKSPACE_NEW]: handleWorkspaceNew,
[SOCKET_EVENTS.WORKSPACE_UPDATE]: handleWorkspaceUpdate,
[SOCKET_EVENTS.WORKSPACE_DELETE]: handleWorkspaceDelete,
[SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED]: handleWorkspaceMemberAdded,
[SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED]: handleWorkspaceMemberRemoved,
[SOCKET_EVENTS.CHANNEL_NEW]: handleChannelNew,
[SOCKET_EVENTS.CHANNEL_UPDATE]: handleChannelUpdate,
[SOCKET_EVENTS.CHANNEL_DELETE]: handleChannelDelete,
[SOCKET_EVENTS.CHANNEL_MEMBER_JOINED]: handleChannelMemberJoined,
[SOCKET_EVENTS.CHANNEL_MEMBER_LEFT]: handleChannelMemberLeft,
[SOCKET_EVENTS.CHANNEL_MEMBER_ADDED]: handleChannelMemberAdded,
[SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED]: handleChannelMemberRemoved,
[SOCKET_EVENTS.REACTION_ADDED]: handleReactionAdded,
[SOCKET_EVENTS.REACTION_REMOVED]: handleReactionRemoved,
[SOCKET_EVENTS.USER_PROFILE_UPDATED]: handleProfileUpdated,
[SOCKET_EVENTS.NOTIFICATION_NEW]: handleNotificationNew,
```

---

## 8. Implementation Phases

### Day 1 — Foundation & Schema

**Theme:** Set up the infrastructure. No UI changes.

1. **Fix remaining `editMessage` debt** — Wrap `getMessageById` + validation + update inside `prisma.$transaction(async (tx) => { ... })`
2. **Add Prisma models** — `Workspace`, `WorkspaceMember`, `Reaction`, `UserNotification`. Add `displayName`/`bio` to `User`. Add `workspace` FK relation to `Conversation`. Add `archivedAt` to `Conversation`. Add `reactions` to `Message`.
3. **Run migration** — `npx prisma migrate dev --name add_phase2_models`
4. **Create server module scaffolding** — `workspaces/`, `channels/`, `reactions/`, `profiles/`, `notifications/` directories with route scaffolding
5. **Register new routes** in `app.ts`
6. **Extend socket events** — Add all new event constants to `shared/socket-events.ts`
7. **Update socket.ts room joining** — Auto-join workspace rooms on connect
8. **Extend socket.dispatcher.ts** — Add dispatch helpers for workspace, channel, reaction, profile, notification events

### Day 2 — User Profiles

1. **Backend:** `profiles.controller.ts`, `profiles.service.ts`, `profiles.schema.ts`
2. **Avatar upload** — Supabase Storage, `POST /api/profiles/me/avatar`
3. **Socket event** — `user:profile-updated` dispatch
4. **Client:** Profile page, edit form, avatar upload
5. **Navigation rail** — Click user avatar → profile dropdown
6. **Real-time update** — Listen for `user:profile-updated` in `useGlobalSocket`

### Day 3 — Workspaces

1. **Backend:** `workspaces.controller.ts`, `workspaces.service.ts`, `workspaces.schema.ts`
2. **Full workspace CRUD** — Create, list, get, update, delete
3. **Membership management** — Add/remove members, role changes, join/leave
4. **Socket events** — workspace:new/update/delete, workspace:member-added/removed
5. **Client:** `WorkspaceModule` — WorkspaceSwitcher, workspace modals, member management
6. **INVITE resolver** — Implement `workspaceInviteResolver` fully (was `NOT_IMPLEMENTED`)
7. **Create notification** on workspace invite for the invited user
8. **Navigation rail** — Show workspace icons for switching

### Day 4 — Channels (Public & Private)

1. **Backend:** `channels.controller.ts`, `channels.service.ts`, `channels.schema.ts`
2. **Channel CRUD** — Create (with workspaceId, type=CHANNEL), list (public/private visibility), update, archive
3. **Channel membership** — Join public, leave, add members to private, remove
4. **Socket events** — channel:new/update/delete, channel:member-joined/left/added/removed
5. **INVITE resolver** — Implement `channelInviteResolver` fully (was `NOT_IMPLEMENTED`)
6. **Create notification** on channel invite
7. **Client:** `WorkspaceSidebar` with channel list, `ChannelHeader`, `CreateChannelModal`
8. **Extend existing message endpoints** — `GET /api/conversations/:id/messages` and `POST /api/conversations/:id/messages` work for channels (type=CHANNEL conversations) out of the box
9. **Update `GET /api/conversations`** — Add optional `workspaceId` query param
10. **Socket.ts room auto-join** — Extend to also join workspace rooms

### Day 5 — Reactions

1. **Backend:** `reactions.controller.ts`, `reactions.service.ts`, `reactions.schema.ts`
2. **Toggle reaction endpoint** — `POST /api/messages/:messageId/reactions` with add/remove
3. **Socket events** — `reaction:added`, `reaction:removed`
4. **Update `getMessages`** — Include `reactions` relation in the Prisma query
5. **Client:** `ReactionBar` component (inline below message), `ReactionPicker` popover
6. **Client socket handling** — `useConversationSocket` listens for reaction events, updates message cache
7. **Create notification** on reaction to user's message

### Day 6 — Notifications & Invite Inbox

1. **Backend:** `notifications.controller.ts`, `notifications.service.ts`, `notifications.schema.ts`
2. **Notification CRUD** — List (paginated), mark read, mark all read, delete
3. **Mention detection** — Parse `@username` in message content on send/create
4. **Notification triggers:**
   - Message mentioning user → `MENTION` notification
   - Workspace invite created → `INVITE` notification
   - Channel invite/added → `INVITE` / `MEMBER_ADDED` notification
   - Reaction on user's message → `REACTION` notification
5. **Socket event** — `notification:new` emitted to `user:{userId}` room
6. **Client:** `NotificationBell` (bell icon with badge), `NotificationList`, `NotificationCard`
7. **Invite inbox** — Notification cards for invite types show Accept/Dismiss actions
8. **Accept flow** — Click Accept → `POST /api/invites/resolve { token }` → follow redirect
9. **Update InviteProcessor** — Handle notification-based invite resolution alongside link-based

### Day 7 — Polish, Integration & Onboarding

1. **Onboarding flow** — Multi-step wizard for new users (profile creation, first workspace, first channels)
2. **Quick switcher** — `Ctrl+K` command palette (workspaces, channels, users)
3. **Empty states** — No channels, no messages, no workspace members
4. **Loading skeletons** — Workspace, channel, member list skeletons
5. **Mobile responsiveness** — Collapsible sidebar, bottom navigation for workspace context
6. **Keyboard shortcuts** — `Ctrl+N` new channel, `Escape` close modals, arrow navigation
7. **Animation** — Message fade-in, sidebar slide, modal transitions
8. **Documentation** — Update all `.docs/` and `.agents/` files
9. **Integration testing** — Full Phase 2 demo scenario

---

## 9. Migration Strategy

### Data Migration

No existing data migration is needed because:
- Existing DMs have `type: DM` — they remain as-is, unaffected by channels
- Existing `workspaceId` values on conversations are all `null`
- No existing data maps to the new models

The migration is purely schema-based: add new tables and columns.

### Zero-Downtime Considerations

- New models (`Workspace`, `WorkspaceMember`, `Reaction`, `UserNotification`) are additive — no existing tables modified
- `User` model: `displayName` and `bio` are nullable — backward compatible
- `Conversation` model: `archivedAt` is nullable — backward compatible
- `Message` model: `reactions` is a new relation — backward compatible
- The existing `workspaceId` field on `Conversation` gains a FK constraint — this requires that all existing `workspaceId` values (all null) are valid, which they are

### Rollback Plan

To roll back Phase 2:
1. Revert all new route registrations in `app.ts`
2. Revert new socket event constants and dispatchers
3. Keep the migration (additive changes are safe)
4. Revert client module additions

---

## 10. Open Questions & Decisions

### Decisions Needed

| Question | Options | Recommendation |
|---|---|---|
| **Channel name uniqueness scope** | Per-workspace or global? | **Per-workspace** — enforced in service layer |
| **Delete vs archive channels** | Hard delete or soft archive? | **Archive** (`archivedAt` field) — preserves message history |
| **Notification persistence** | Keep indefinitely or auto-clean? | **60-day retention** — cleanup via cron or manual prune |
| **Mention format** | `@username` or `@displayName`? | **`@username`** — unique, deterministic |
| **Profile visibility** | Public vs private? | **Minimal public** (username, displayName, avatar, bio) — sufficient for collaboration |
| **Workspace slug** | Auto-generated or user-defined? | **User-defined** at creation (lowercase, alphanumeric + hyphens), must be unique |
| **Mobile workspace UI** | Tab bar or sliding drawer? | **Bottom tab bar** — workspaces navigation on mobile, with sliding drawer for channels |
| **Notification center location** | Sidebar panel or full page? | **Dropdown from navigation rail** for quick access, with a "View all" link to full page at `/notifications` |

### Architectural Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Performance: `GET /api/conversations` gets slower** with workspace-scoped channels | Medium | Add proper indexes on `workspaceId`, use selective queries (don't load all conversations when in workspace context) |
| **Socket room explosion** from workspace rooms | Low | One room per workspace per user is fine for thousands of users |
| **Notification spam** from reactions | Medium | Batch similar notifications, don't create a notification for your own reactions |
| **Race condition: channel create + member join** | Medium | Use Prisma `$transaction` for atomic create + member creation |

### Edge Cases

| Scenario | Handling |
|---|---|
| User added to private channel but hasn't joined workspace | Return 400 — must join workspace first |
| Channel name already exists in workspace | Return 409 — "Channel name already taken" |
| Admin tries to remove workspace OWNER | Return 403 — owners can only be removed by themselves |
| User is in 50+ workspaces | Workspace list is paginated, switching latency is minimal |
| Reaction on deleted message | Allow — reactions aren't deleted with messages (onDelete: Cascade handles this) |
| User mentioned in a channel they haven't joined | No notification — they're not a member of the conversation |
| Invite link expired + user clicks Accept in notification | `resolveInviteService` returns `INVALID_OR_EXPIRED_INVITE` — show error toast |

---

> **Next Steps:** Review this plan, resolve the open questions, then begin Day 1 implementation starting with the Prisma schema migration and `editMessage` transaction fix.
