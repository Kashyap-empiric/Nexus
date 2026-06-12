# Workspace Channel Features — Implementation Plan

> **Status:** ✅ **DONE — All steps verified complete and implemented.**
> **Key decision:** Keep `ConversationMember` for all channel types (preserves unread tracking).
> **Branch:** `feat/workspaces` — ready for merge.
> **Last updated:** 2026-06-12
>
> **Verification:** All 14 steps implemented. 5 additional fixes applied (security, socket, code dedup).
> Backward-compatible migration created and applied. Env vars centralized.

---

## Table of Contents

1. [What Already Exists (Reuse, Don't Repeat)](#1-what-already-exists-reuse-dont-repeat)
2. [Architecture Decisions](#2-architecture-decisions)
3. [Access Control](#3-access-control)
4. [Data Flow](#4-data-flow)
5. [Server-Side Changes](#5-server-side-changes)
6. [Client-Side Changes](#6-client-side-changes)
7. [Socket Event Integration](#7-socket-event-integration)
8. [Implementation Order](#8-implementation-order)
9. [File Changes Summary](#9-file-changes-summary)
10. [Deviations from Plan](#10-deviations-from-plan)
11. [Future Considerations (NOT for MVP)](#11-future-considerations-not-for-mvp)
12. [Key Decisions Made](#12-key-decisions-made)

---

## 1. What Already Exists (Reuse, Don't Repeat)

### Database (Prisma Schema)

- `Conversation.isPrivate: Boolean` — already exists, currently hardcoded to `false` in `createChannel`
- `WorkspaceMember.role: WorkspaceRole` — enum with `OWNER | ADMIN | MEMBER` — already exists
- `WorkspaceMember.user` relation — already included by `findWorkspaceByIdOrSlug`
- `Conversation.members` — already exists, used for channel membership
- `Conversation.workspaceId` — already exists on the model; currently lacks a FK relation to `Workspace` (just needs the relation defined)

### Server (Existing Endpoints)

| Method | Route | Status |
|--------|-------|--------|
| GET | `/api/workspaces` | ✅ |
| POST | `/api/workspaces` | ✅ |
| GET | `/api/workspaces/:id` | ✅ |
| GET | `/api/workspaces/:id/channels` | ✅ |
| POST | `/api/workspaces/:id/channels` | ✅ |

### Server (Existing Utilities)

- `permissions.ts` exports `isWorkspaceMember` and `verifyConversationMembership`
- `auth.repository.ts` has `findWorkspaceMember(userId, workspaceId)` — can check role
- `socket.dispatcher.ts` has `dispatchConversationNew` and `dispatchMessageEvent`
- `workspaces.repository.ts` has `findWorkspaceByIdOrSlug` (includes `members` + `channels`)
- `conversations.repository.ts` has `findById`, `findChannelByWorkspaceId`, `findChannelIdsByWorkspaceId`

### Client (Existing Components)

- `CreateChannelModal` — channel creation form (currently no public/private toggle)
- `Sidebar` — renders channels list (flat, no public/private separation)
- `WorkspaceHeader` — workspace name + dropdown with "Invite People"
- `ActiveConversation` — renders DM/channel view with header
- `NavigationRail` — workspace switching
- `useSocketStore.onlineUsers` — `Set<string>` of online user IDs, available everywhere
- `useWorkspaceDetails` — fetches workspace + channels
- `useWorkspaceChannelsQuery` — refetches channels every 5s
- `PresenceIndicator` — shows green dot for online users
- Conversation model's `type` enum — already supports `DM` and `CHANNEL`
- Invite system + polymorphic resolver pattern — tested and ready to extend for workspace/channel resolvers

---

## 2. Architecture Decisions

### 2.1 `ConversationMember` for all channel types

| Channel Type | Membership Model |
|---|---|
| **DM** | `ConversationMember` — participants only |
| **Public Channel** | `ConversationMember` — auto-created when user joins workspace or channel is created |
| **Private Channel** | `ConversationMember` — only for invited members |

**Why NOT drop membership rows for public channels:**
- `lastReadMessageId` on `ConversationMember` powers unread counts, read tracking, and last-seen position
- Removing it from public channels would require a separate read-state system (premature complexity for MVP)
- Slack, Discord, and Teams all have significantly more machinery around read state
- `ConversationMember` already solves multiple problems — keep using it

### 2.2 Add `createdBy` to channel conversations

```prisma
model Conversation {
  // ...existing fields
  createdBy   String?   // userId who created the channel
}
```

Enables:
- Moderation auditing
- "Created by Robin, 2 weeks ago" in UI
- Simpler permission checks

### 2.3 Use `ChannelVisibility` enum

Replace (or alongside) `isPrivate: Boolean` with:

```prisma
enum ChannelVisibility {
  PUBLIC
  PRIVATE
}
```

```prisma
visibility ChannelVisibility @default(PUBLIC)
```

Future-proof for `ANNOUNCEMENT`, `READ_ONLY` etc.

### 2.4 Hard delete for channels

Delete channel → hard delete → cascade messages.

No soft deletion at this stage — no audit logs, retention policies, or legal requirements exist.

### 2.5 Protect `#general`

- Every workspace must always have a `#general` channel
- Cannot be deleted
- Cannot be renamed to anything else
- Default landing channel for new members

### 2.6 Socket events — typed payloads, not separate events

Do NOT create separate events for every action. Keep a pattern where events are named by resource, not by action.

Use three resource-level events with typed action payloads:

```
✓ channel:update
✓ member:update
✓ workspace:update
```

**Payload structure:**

```ts
// channel:update — emitted to all channel members
{
  action: "CREATED" | "RENAMED" | "DELETED" | "MEMBER_JOINED" | "MEMBER_LEFT",
  channel: { id, name?, visibility?, ... },
  userId?: string        // for MEMBER_JOINED / MEMBER_LEFT
}

// member:update — workspace-level role changes
{
  action: "ROLE_CHANGED",
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER"
}

// workspace:update — workspace metadata changes
{
  action: "UPDATED",
  workspace: { id, name?, avatarUrl? }
}
```

**Where each action lives:**

| Event | Action | Meaning |
|---|---|---|
| `channel:update` | `CREATED` | New channel created → add to sidebar |
| `channel:update` | `RENAMED` | Channel renamed → update name in sidebar |
| `channel:update` | `DELETED` | Channel deleted → remove from sidebar, redirect if viewing |
| `channel:update` | `MEMBER_JOINED` | User joined a private channel → add to their sidebar |
| `channel:update` | `MEMBER_LEFT` | User left a private channel → remove from their sidebar |
| `member:update` | `ROLE_CHANGED` | User's workspace role changed → update badge in member list |
| `workspace:update` | `UPDATED` | Workspace metadata changed (name, avatar) |

**Why this approach:**

1. **Consistency** — Uses `resource:action` pattern. Simpler than registering separate handlers per action.
2. **Fewer socket event constants** — Reduces noise in `socket-events.ts`.
3. **Easier to extend** — Adding a new action (e.g., `ARCHIVED`) doesn't require new constants or handler registrations.

---

## 3. Access Control

### 3.1 `verifyChannelAccess(userId, channelId)` — reusable helper

| Scenario | Check |
|---|---|
| **DM** | `ConversationMember` required |
| **Public Channel** | `WorkspaceMember` required |
| **Private Channel** | `ConversationMember` required |

Every endpoint must use this helper:
- Get messages
- Send messages
- Edit messages
- Delete messages
- Socket room join

Without this, private channels are not actually private.

### 3.2 Channel management permissions

| Action | Who can do it |
|---|---|
| **Rename channel** | Any workspace member |
| **Delete channel** | OWNER or ADMIN |
| **Create channel** | Any workspace member |
| **Remove #general** | Never |

### 3.3 Role management permissions

| Action | Who can do it |
|---|---|
| **Promote to ADMIN** | OWNER only |
| **Demote from ADMIN** | OWNER only |
| **Transfer ownership** | Not in MVP |
| **Owner demoting self** | Disallowed — workspace must always have exactly one owner |
| **Owner removing self** | Disallowed |
| **ADMIN promoting others** | Disallowed |

---

## 4. Data Flow

### Creating a public channel

```
User clicks Create Channel (Public)
  → POST /workspaces/:id/channels { name, visibility: "PUBLIC" }
  → Server creates Conversation with visibility=PUBLIC
  → Server bulk-creates ConversationMember for all workspace members
  → Server emits channel:update({ action: "CREATED", channel })
  → Clients add channel to sidebar
```

### Creating a private channel

```
User clicks Create Channel (Private)
  → POST /workspaces/:id/channels { name, visibility: "PRIVATE", memberIds: [...] }
  → Server creates Conversation with visibility=PRIVATE
  → Server creates ConversationMember for creator + invited users
  → Server emits channel:update({ action: "CREATED", channel }) to invited users only
  → Invited clients add channel to sidebar
```

### Renaming a channel

```
User renames channel
  → PATCH /workspaces/:id/channels/:channelId { name: "new-name" }
  → Server validates: user is workspace member, not #general
  → Server updates Conversation.name
  → Server emits channel:update({ action: "RENAMED", channel: { id, name } })
  → Clients update channel name in sidebar + header
```

### Deleting a channel

```
User deletes channel
  → DELETE /workspaces/:id/channels/:channelId
  → Server validates: OWNER or ADMIN, not #general
  → Server hard-deletes Conversation (cascade: messages, memberships)
  → Server emits channel:update({ action: "DELETED", channel: { id: channelId } })
  → Clients remove channel from sidebar
  → If currently viewing: redirect to #general
```

---

## 5. Server-Side Changes

### 5.1 PATCH `/api/workspaces/:id/channels/:channelId` — Update Channel Name ✅

### 5.2 DELETE `/api/workspaces/:id/channels/:channelId` — Delete Channel ✅

### 5.3 PATCH `/api/workspaces/:id/members/:userId/role` — Promote to Admin ✅

### 5.4 GET `/api/workspaces/:id/members` — List Members ✅

### 5.5 Update POST `/api/workspaces/:id/channels` — Support `visibility` ✅

### 5.6 Database schema changes ✅
- `ChannelVisibility` enum added
- `createdBy` field added to Conversation
- Migration created

### 5.7 `verifyChannelAccess()` helper ✅
- Created at `server/src/modules/channels/channel-access.ts`
- `verifyChannelAccess(userId, channelId)` — DM/Public/Private access logic
- `verifyWorkspaceMember(userId, workspaceId)` — delegates to existing `isWorkspaceMember`

---

## 6. Client-Side Changes

### 6.1 CreateChannelModal — Add Public/Private Toggle ✅
### 6.2 Workspace API — New Endpoints ✅
### 6.3 Workspace Hooks — New Mutations ✅
### 6.4 Sidebar — Split Channels into Public/Private Sections ✅
### 6.5 Channel Context Menu — Edit Name / Delete ✅
### 6.6 Member List Right Panel — Discord Style ✅
### 6.7 Workspace Types — Update WorkspaceMember Type ✅
### 6.8 Socket Event Handling ✅
- `channel:update` registered in global socket events with targeted cache updates
- `member:update` registered with targeted role updates
- `workspace:update` registered (invalidation-based)

---

## 7. Socket Event Integration

### New Events

| Direction | Event | Payload | Purpose |
|-----------|-------|---------|---------|
| S → C | `channel:update` | `{ action, channel, userId? }` | Channel created/renamed/deleted/member joined or left |
| S → C | `member:update` | `{ action, userId, role }` | Workspace role changed |
| S → C | `workspace:update` | `{ action, workspace }` | Workspace metadata changed |

### Socket Dispatcher Extensions ✅

### Socket.ts Room Joining Extension ✅
- Users join `workspace:{workspaceId}` rooms on connect
- Users leave/join workspace rooms on workspace switch
- Private channel rooms are filtered to only those the user has access to

---

## 8. Implementation Order

| Step | Feature | Status |
|------|---------|--------|
| 1 | Database schema changes (ChannelVisibility, createdBy) | ✅ |
| 2 | `verifyChannelAccess()` helper | ✅ |
| 3 | PATCH channel name (server) | ✅ |
| 4 | DELETE channel (server) | ✅ |
| 5 | PATCH member role (server) | ✅ |
| 6 | GET workspace members (server) | ✅ |
| 7 | Socket dispatcher extensions + room joining | ✅ |
| 8 | Update POST channel — support visibility | ✅ |
| 9 | Public/private toggle in CreateChannelModal | ✅ |
| 10 | Split sidebar channels into public/private | ✅ |
| 11 | Channel context menu (rename, delete) | ✅ |
| 12 | Member list right panel | ✅ |
| 13 | Promote to admin UI in member list | ✅ |
| 14 | Socket event handling (client-side) | ✅ |

---

## 9. File Changes Summary

### Server

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ChannelVisibility` enum, `createdBy` on Conversation |
| `server/src/modules/channels/channel-access.ts` | **New** — `verifyChannelAccess()` helper |
| `server/src/modules/auth/auth.repository.ts` | **Fixed** — `findWorkspaceChannelsByUserId` filters private channels; added `findUserWorkspaceIds` |
| `server/src/modules/auth/auth.service.ts` | Added `getUserWorkspaceIds` |
| `server/src/modules/workspaces/workspaces.service.ts` | Add rename, delete, members, role management logic |
| `server/src/modules/workspaces/workspaces.repository.ts` | Add repository methods for new operations |
| `server/src/modules/workspaces/workspaces.controller.ts` | Add route handlers |
| `server/src/modules/workspaces/workspaces.routes.ts` | Add new routes (rename, delete, members, role) |
| `server/src/modules/workspaces/workspaces.types.ts` | Add new types |
| `server/src/socket/socket.dispatcher.ts` | Add channel:update, member:update dispatch |
| `server/src/socket/socket.ts` | Extend room joining for workspace rooms |
| `server/src/socket/handlers/workspace.handler.ts` | Join/leave workspace rooms on switch; filter private channels by access |
| `server/src/modules/conversations/conversations.repository.ts` | **Fixed** — `findChannelIdsByWorkspaceId` accepts optional userId for private channel filtering |
| `server/src/shared/socket-events.ts` | Add new event constants |

### Client

| File | Change |
|---|---|
| `client/src/modules/workspaces/components/CreateChannelModal.tsx` | Add visibility toggle |
| `client/src/modules/workspaces/components/WorkspaceHeader.tsx` | Add rename/delete actions |
| `client/src/modules/workspaces/components/WorkspaceChannelItem.tsx` | **New** — context menu for rename/delete |
| `client/src/modules/workspaces/components/MemberListPanel.tsx` | **New** — right-side member list |
| `client/src/modules/conversations/components/Sidebar.tsx` | Split public/private sections |
| `client/src/modules/workspaces/types/workspace.ts` | Update WorkspaceMember type |
| `client/src/modules/workspaces/api/workspaces.api.ts` | Add new API calls |
| `client/src/modules/workspaces/hooks/useWorkspaces.ts` | Add new hooks |
| `client/src/socket/handlers/workspace.handlers.ts` | **Improved** — targeted cache updates for channel:update and member:update |
| `client/src/socket/eventRouter.ts` | Register new handlers |
| `client/src/modules/chat/hooks/useGlobalSocket.ts` | Register new socket events |
| `client/src/socket/socket-events.ts` | Add new event constants |

---

## 10. Deviations from Plan

The following changes were made beyond the original 14-step plan during implementation:

| Deviation | Reason |
|-----------|--------|
| **Added `findUserWorkspaceIds` to auth.repository/service** | Needed by `socket.ts` to join workspace rooms on connect — original plan just showed pseudocode |
| **Fixed socket.ts: join workspace rooms on connect** | Original plan defined `dispatchChannelUpdate`/`dispatchMemberUpdate` to emit to `workspace:{id}`, but `socket.ts` never joined those rooms — events were silently lost |
| **Fixed workspace.handler.ts: join/leave workspace rooms on switch** | Ensured workspace-level events follow the active workspace context |
| **Fixed `verifyWorkspaceMember` duplication** | Delegated to existing `isWorkspaceMember` instead of duplicating Prisma query |
| **⚠️ Security fix: `findWorkspaceChannelsByUserId` now filters private channels** | Original code returned ALL channels from user's workspaces, leaking private channel socket rooms to non-members. **Not in original plan — discovered during audit.** |
| **⚠️ Security fix: `findChannelIdsByWorkspaceId` accepts userId for private channel filtering** | Same private channel leak applied to `workspace:join` handler. **Not in original plan — discovered during audit.** |
| **Improved client socket handlers: targeted cache updates** | Original plan just said "register handlers." Implemented actual cache mutations instead of basic invalidation for `channel:update` and `member:update` |
| **Consolidated handlers into `workspace.handlers.ts`** | Original plan called for separate `channel.handlers.ts` and `member.handlers.ts` files. Kept them in one file since all are workspace-related, avoiding unnecessary file splitting |

---

## 11. Future Considerations (NOT for MVP)

- Soft delete with retention policies
- Announcement / read-only channel types
- Channel categories / grouping
- Channel-level moderation (ban, mute)
- Transfer workspace ownership
- Pagination for member list (workspaces with 1000+ members)
- Multi-workspace member list aggregation
- Archiving (vs hard delete) with `archivedAt` field
- 60-day notification retention with cleanup cron

---

## 12. Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| **Delete behavior** | Hard delete | No recovery mechanism planned; simpler implementation |
| **Member list default** | Open on desktop | Matches Discord/Slack UX pattern |
| **Rename permissions** | Any workspace member | Simplest access model; channel management is lightweight |
| **Delete permissions** | OWNER or ADMIN only | Prevents accidental deletion by regular members |
| **Protect #general** | Yes | Every workspace needs a default landing channel |
| **Socket event pattern** | `resource:update` with `action` payload | Fewer constants, easier to extend |
| **ChannelVisibility** | Enum (not boolean `isPrivate`) | Future-proof for additional channel types |
| **Read state** | Keep `ConversationMember` | Avoids a separate read-state system |
| **verifyWorkspaceMember** | Delegate to `isWorkspaceMember` | Avoids duplicate Prisma query |
| **Private channel socket filtering** | Query-level filtering | Prevents socket room leaks for unauthorized private channel access |
