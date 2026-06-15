# Server Workspaces Module

**Location:** `server/src/modules/workspaces/`

## Overview

The Workspaces module manages team workspaces — creation, channels within workspaces (CRUD), member management, role-based access control, and notification integration for member/channel events.

---

## Files & Functions

### `workspaces.service.ts`
Business logic layer.

| Function | Signature | Purpose |
|---|---|---|
| `getUserWorkspaces` | `(userId) => Promise<Workspace[]>` | Gets all workspaces with unread counts |
| `getWorkspaceDetails` | `(userId, slugOrId) => Promise<Workspace>` | Gets workspace with members and channels |
| `getWorkspaceChannels` | `(userId, slugOrId) => Promise<Conversation[]>` | Gets accessible channels with unread counts |
| `createWorkspace` | `(userId, name, slug, imageUrl?) => Promise<Workspace>` | Creates workspace + #general channel atomically |
| `createChannel` | `(slugOrId, name, visibility, userId) => Promise<Conversation>` | Creates channel; public = all members, private = only creator |
| `updateChannel` | `(slugOrId, channelId, data, userId) => Promise<Conversation>` | Updates name/visibility; OWNER/ADMIN only for visibility |
| `deleteChannel` | `(slugOrId, channelId, userId) => Promise<Conversation>` | Deletes channel; OWNER/ADMIN only; #general protected |
| `getWorkspaceMembers` | `(slugOrId, userId) => Promise<WorkspaceMember[]>` | Gets members with user data |
| `updateMemberRole` | `(slugOrId, memberUserId, role, userId) => Promise<WorkspaceMember>` | Changes role; OWNER only; cannot self-demote |
| `removeMember` | `(slugOrId, memberUserId, userId) => Promise<object>` | Removes member; cannot remove OWNER or self |

### `workspaces.repository.ts`
Data access layer.

| Function | Signature | Purpose |
|---|---|---|
| `findWorkspaceByIdOrSlug` | `(identifier) => Workspace + channels + members` | Lookup by ID or slug |
| `findUserWorkspaces` | `(userId) => Workspace[]` | All workspaces for a user |
| `createWorkspaceInTransaction` | `(tx, data) => Workspace` | Transactional create |
| `createChannelInTransaction` | `(tx, data) => Conversation` | Transactional channel create (for #general) |
| `createChannel` | `(data) => Conversation` | Direct channel creation |
| `onboardUserToWorkspaceInTransaction` | `(tx, workspaceId, userId) => {generalChannelId}` | Adds user to workspace + #general; handles P2002 gracefully |
| `updateChannel` | `(channelId, data) => Conversation` | Updates channel metadata |
| `deleteConversation` | `(channelId) => Conversation` | Hard-deletes conversation |
| `updateWorkspaceMemberRole` | `(workspaceId, userId, role) => WorkspaceMember` | Updates role with user info |
| `removeWorkspaceMember` | `(workspaceId, userId) => Promise<void>` | Removes member + cleans up channel memberships |

### `workspaces.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `getUserWorkspaces` | `GET /api/workspaces` | Returns workspaces for user |
| `getWorkspaceDetails` | `GET /api/workspaces/:id` | Returns workspace + channels |
| `getWorkspaceChannels` | `GET /api/workspaces/:id/channels` | Returns channels only |
| `createWorkspace` | `POST /api/workspaces` | Creates workspace + #general |
| `createChannel` | `POST /api/workspaces/:id/channels` | Creates channel + CHANNEL_CREATED notifications |
| `updateChannel` | `PATCH /api/workspaces/:id/channels/:channelId` | Updates channel + socket event |
| `deleteChannel` | `DELETE /api/workspaces/:id/channels/:channelId` | Deletes channel + socket event |
| `inviteMemberByUsername` | `POST /api/workspaces/:id/invite` | Invites by username or email + INVITE_RECEIVED notification |
| `inviteMembers` | `POST /api/workspaces/:id/invite-multiple` | Batch invite by userIds (max 50) |
| `getWorkspaceMembers` | `GET /api/workspaces/:id/members` | Returns member list |
| `updateMemberRole` | `PATCH /api/workspaces/:id/members/:userId/role` | Changes role + socket event |
| `removeWorkspaceMember` | `DELETE /api/workspaces/:id/members/:userId` | Removes member + MEMBER_REMOVED notification |

### Notification Integration
The workspaces controller calls `createAndDispatch()` for:
- **CHANNEL_CREATED**: Channel creation (excluding creator)
- **INVITE_RECEIVED**: User invited via invite or batch invite
- **MEMBER_REMOVED**: Member removed from workspace (notified with reason)

### Socket Events Dispatched
| Event | When |
|-------|------|
| `channel:update` | Channel created/updated/deleted → workspace room |
| `member:update` | Role changed/removed → workspace room |
| `conversation:new` | Channel created → all members |

### `workspaces.routes.ts`
Route registration (all require `authMiddleware`).

| Endpoint | Handler |
|---|---|
| `GET /` | `getUserWorkspaces` |
| `POST /` | `createWorkspace` |
| `GET /:id` | `getWorkspaceDetails` |
| `GET /:id/channels` | `getWorkspaceChannels` |
| `POST /:id/channels` | `createChannel` |
| `PATCH /:id/channels/:channelId` | `updateChannel` |
| `DELETE /:id/channels/:channelId` | `deleteChannel` |
| `GET /:id/members` | `getWorkspaceMembers` |
| `POST /:id/invite` | `inviteMemberByUsername` |
| `POST /:id/invite-multiple` | `inviteMembers` |
| `PATCH /:id/members/:userId/role` | `updateMemberRole` |
| `DELETE /:id/members/:userId` | `removeWorkspaceMember` |

---

## Architecture Decisions

1. **Slug-based routing**: Workspaces looked up by ID or slug. Validated with regex `^[a-z0-9-]+$`.

2. **#general Channel**: Auto-created per workspace, protected from deletion, new members auto-joined.

3. **Role-based Access**: OWNER (full control), ADMIN (manage channels), MEMBER (basic). Only OWNER can change roles.

4. **Channel Visibility**: PUBLIC (all members auto-joined) or PRIVATE (only explicit members).

5. **Notification Integration**: Channel creation and member removal create notifications via `createAndDispatch()` (fire-and-forget).
