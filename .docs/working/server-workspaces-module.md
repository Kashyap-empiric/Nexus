# Server Workspaces Module

**Location:** `server/src/modules/workspaces/`

## Overview

The Workspaces module manages team workspaces — creation, channels within workspaces (CRUD), member management, and role-based access control. Workspaces are the container for channels and team collaboration in Nexus. Each workspace has a URL-friendly slug, members with roles (OWNER/ADMIN/MEMBER), and a default #general channel created automatically on workspace creation.

---

## Files & Functions

### `workspaces.service.ts`
Business logic layer.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `getUserWorkspaces` | `(userId) => Promise<Workspace[]>` | Gets all workspaces a user belongs to | Powers workspace switcher UI |
| `getWorkspaceDetails` | `(userId, slugOrId) => Promise<Workspace>` | Gets workspace with members and channels | Validates membership before returning details |
| `getWorkspaceChannels` | `(userId, slugOrId) => Promise<Conversation[]>` | Gets all channels in a workspace the user can access | Filters by user access via the conversations repository |
| `createWorkspace` | `(userId, name, slug, imageUrl?) => Promise<Workspace>` | Creates a workspace, adds creator as OWNER, creates #general channel | Uses a Prisma transaction to atomically create workspace + general channel + owner membership |
| `createChannel` | `(slugOrId, name, visibility, userId) => Promise<Conversation>` | Creates a channel within a workspace | For public channels, adds all workspace members; for private, only the creator |
| `updateChannel` | `(slugOrId, channelId, data, userId) => Promise<Conversation>` | Updates channel name or visibility | Name changes allowed for any member; visibility changes require OWNER/ADMIN |
| `deleteChannel` | `(slugOrId, channelId, userId) => Promise<Conversation>` | Deletes a channel | Only OWNER/ADMIN can delete; #general cannot be deleted |
| `getWorkspaceMembers` | `(slugOrId, userId) => Promise<WorkspaceMember[]>` | Gets workspace members | Verifies membership before returning |
| `updateMemberRole` | `(slugOrId, memberUserId, role, userId) => Promise<WorkspaceMember>` | Changes a member's role | Only OWNER can change roles; OWNER cannot change their own role |

### `workspaces.repository.ts`
Data access layer.

| Function | Signature | Purpose |
|---|---|---|
| `findWorkspaceById` | `(workspaceId) => Workspace + members` | Lookup by ID with members |
| `findWorkspaceByIdOrSlug` | `(identifier) => Workspace + channels + members` | Lookup by ID or slug — supports both URL formats |
| `findUserWorkspaces` | `(userId) => Workspace[]` | All workspaces for a user |
| `createWorkspaceInTransaction` | `(tx, data) => Workspace` | Transactional workspace creation |
| `createChannelInTransaction` | `(tx, data) => Conversation` | Transactional channel creation (for #general) |
| `createChannel` | `(data) => Conversation` | Direct channel creation |
| `onboardUserToWorkspaceInTransaction` | `(tx, workspaceId, userId) => {generalChannelId}` | Adds user as MEMBER to workspace and to #general channel. Gracefully handles duplicate membership (P2002) |
| `updateChannel` | `(channelId, data) => Conversation` | Updates channel metadata |
| `deleteConversation` | `(channelId) => Conversation` | Hard-deletes a conversation (channel) |
| `updateWorkspaceMemberRole` | `(workspaceId, userId, role) => WorkspaceMember + user` | Updates member role with user info include |

### `workspaces.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `getUserWorkspaces` | `GET /api/workspaces` | Returns all workspaces for the user |
| `getWorkspaceDetails` | `GET /api/workspaces/:id` | Returns workspace details + channels |
| `getWorkspaceChannels` | `GET /api/workspaces/:id/channels` | Returns channels only |
| `createWorkspace` | `POST /api/workspaces` | Creates workspace with #general channel |
| `createChannel` | `POST /api/workspaces/:id/channels` | Creates a channel, dispatches socket event + creates CHANNEL_CREATED notifications |
| `updateChannel` | `PATCH /api/workspaces/:id/channels/:channelId` | Updates channel, dispatches CHANNEL_UPDATE socket event |
| `deleteChannel` | `DELETE /api/workspaces/:id/channels/:channelId` | Deletes channel, dispatches CHANNEL_UPDATE (DELETED) socket event |
| `inviteMemberByUsername` | `POST /api/workspaces/:id/invite` | Finds user by username, sends INVITE_RECEIVED notification |
| `getWorkspaceMembers` | `GET /api/workspaces/:id/members` | Returns workspace member list |
| `updateMemberRole` | `PATCH /api/workspaces/:id/members/:userId/role` | Changes member role, dispatches MEMBER_UPDATE socket event |

### `workspaces.routes.ts`
Route registration. All routes require `authMiddleware`.

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
| `PATCH /:id/members/:userId/role` | `updateMemberRole` |

### `workspaces.types.ts`
TypeScript types.

| Type | Purpose |
|---|---|
| `WorkspaceMemberDTO` | Member with user profile and role |
| `WorkspaceDTO` | Workspace with members |
| `GetChannelsParams` | Input type for channel queries |

---

## Architecture Decisions

1. **Workspace Slug as Identifier**: Workspaces can be looked up by either ID or slug. Slugs are URL-friendly (`/workspaces/acme-corp/channels/general`) and auto-generated from the workspace name. Slug format is validated with regex `^[a-z0-9-]+$`.

2. **#general Channel Auto-creation**: Every workspace automatically gets a `#general` channel. This is created atomically within the same transaction as the workspace. The `onboardUserToWorkspaceInTransaction` function adds new members to the #general channel automatically.

3. **Role-based Access Control**: Three roles exist — OWNER (full control, can manage roles), ADMIN (can manage channels), MEMBER (basic access). Role checks are enforced in the service layer. The `updateMemberRole` function ensures only OWNERs can change roles and cannot self-demote.

4. **Channel Visibility**: Channels are either PUBLIC (all workspace members are auto-added) or PRIVATE (only explicitly added members). This is enforced by the `createChannel` service function — public channels get all workspace members, private channels get only the creator.

5. **Notification Integration**: The workspaces controller integrates with the notifications module — creating a channel sends CHANNEL_CREATED notifications, and inviting a member sends INVITE_RECEIVED notifications. This is done asynchronously (fire-and-forget) to avoid slowing down the primary API response.

6. **Socket Event Dispatch**: Channel updates (create, update, delete) and member role changes dispatch Socket.io events to the `workspace:{workspaceId}` room, enabling real-time UI updates for all workspace members.
