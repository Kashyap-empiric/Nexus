# Feature: Workspace Management

## Goal

Allow users to create, view, update, and delete workspaces; manage workspace members and their roles; and switch between workspaces.

---

## Current Status

```
Implemented
```

Full workspace CRUD with member management, role hierarchy (OWNER > ADMIN > MEMBER), socket-based updates, unread counts, and slug-based routing.

---

## High-Level Summary

- Workspace creation automatically creates a #general channel with the creator as OWNER.
- Workspace resolution accepts UUID or slug via `findWorkspaceByIdOrSlug()`.
- Role hierarchy: OWNER (full control), ADMIN (channel/member management), MEMBER (send messages, create channels).
- OWNER cannot change their own role (prevents orphaned workspaces).
- Workspace deletion cascades to all channels, messages, and memberships.
- Unread count tracked per-workspace based on channel-level unread messages.
- Socket room `workspace:{id}` for real-time updates.
- Workspace update/deletion broadcast via `WORKSPACE_UPDATE` socket event.
- Members removed from all channel socket rooms on workspace leave/removal.

---

## Code Locations

```
Backend

server/src/modules/workspaces/workspaces.service.ts     — Business logic
server/src/modules/workspaces/workspaces.controller.ts  — Request handlers
server/src/modules/workspaces/workspaces.repository.ts  — Prisma queries
server/src/modules/workspaces/workspaces.routes.ts      — Route definitions
server/src/modules/workspaces/workspaces.schema.ts      — Zod validation
server/src/socket/socket.dispatcher.ts                  — Socket dispatch

Database

server/prisma/schema.prisma

Frontend

client/src/modules/workspaces/index.ts                                  — Module barrel
client/src/modules/workspaces/hooks/useWorkspaces.ts                    — Workspace hooks
client/src/modules/workspaces/hooks/useWorkspaceChannels.ts             — Channel hooks
client/src/modules/workspaces/hooks/useChannelMembers.ts                — Member hooks
client/src/modules/workspaces/api/workspaces.api.ts                     — API client
client/src/modules/workspaces/types/workspace.ts                        — Types
client/src/modules/workspaces/components/WorkspaceHeader.tsx             — Header
client/src/modules/workspaces/components/CreateWorkspaceModal.tsx        — Create modal
client/src/modules/workspaces/components/WorkspaceSettingsModal.tsx      — Settings
client/src/modules/workspaces/components/CreateChannelModal.tsx          — Create channel
client/src/modules/workspaces/components/MemberListPanel.tsx             — Member list
client/src/modules/workspaces/components/CustomRoleDropdown.tsx          — Role dropdown
client/src/modules/workspaces/components/WorkspaceChannelItem.tsx        — Channel item
client/src/modules/workspaces/components/ManageChannelMembersModal.tsx   — Member mgmt
client/src/modules/chat/components/NavigationRail.tsx                    — Workspace nav
```

---

## Database

```prisma
model Workspace {
  id          String          @id
  name        String
  description String?
  imageUrl    String?
  iconPath    String?
  ownerId     String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  slug        String          @unique
  isDeleting  Boolean         @default(false)
  channels    Conversation[]
  owner       User            @relation("WorkspaceOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     WorkspaceMember[]
}

model WorkspaceMember {
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())
  id          String        @default(cuid())
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@index([userId])
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}
```

- `Workspace.slug` has a unique constraint.
- `Workspace.isDeleting` soft-delete flag for async deletion.
- `WorkspaceMember` has composite primary key `(workspaceId, userId)`.
- Cascade delete on workspace deletion cascades to all channels (Conversations), messages, members.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/workspaces` | Required | List user's workspaces (with unread counts) |
| POST | `/api/workspaces` | Required | Create workspace |
| GET | `/api/workspaces/:id` | Required | Get workspace details + channels |
| PATCH | `/api/workspaces/:id` | Required | Update workspace settings |
| DELETE | `/api/workspaces/:id` | Required | Delete workspace |
| POST | `/api/workspaces/:id/leave` | Required | Leave workspace |
| GET | `/api/workspaces/:id/channels` | Required | List workspace channels |
| GET | `/api/workspaces/:id/members` | Required | List workspace members |
| PATCH | `/api/workspaces/:id/members/:userId/role` | Required | Update member role |
| DELETE | `/api/workspaces/:id/members/:userId` | Required | Remove workspace member |
| GET | `/api/workspaces/:id/threads` | Required | Get workspace threads |

### Request Validation

- `createWorkspaceBodySchema`: name (1-100 chars), slug (lowercase, numbers, hyphens, 1-50 chars), imageUrl (optional url), description (optional, max 500).
- `updateWorkspaceBodySchema`: same fields all optional.
- `updateMemberRoleBodySchema`: role (enum: OWNER, ADMIN, MEMBER).

### Permissions

- OWNER: full control — can delete workspace, change any role, remove any member.
- ADMIN: can update workspace settings, manage channels, invite members, remove MEMBER roles.
- MEMBER: can view workspace, create channels, send messages.
- Workspace access requires membership (enforced by `isWorkspaceMember` check).

---

## Backend Implementation

### Workspace Service (`server/src/modules/workspaces/workspaces.service.ts`)

- **`getUserWorkspaces()`**: Fetches user's workspaces with unread counts aggregated from all accessible channels.
- **`getWorkspaceDetails()`**: Finds workspace by id or slug, verifies membership.
- **`getWorkspaceChannels()`**: Returns channels with unread counts, respecting visibility and membership.
- **`createWorkspace()`**: Validates slug format, checks slug uniqueness, creates workspace + #general channel in a transaction.
- **`createChannel()`**: Creates channel with PUBLIC (auto-join all members) or PRIVATE (creator only) visibility.
- **`updateWorkspace()`**: Only OWNER/ADMIN can update. Checks slug uniqueness on change.
- **`deleteWorkspace()`**: Only OWNER can delete. Hard delete (cascade).
- **`leaveWorkspace()`**: Prevents last OWNER from leaving. Removes from all channels.
- **`updateMemberRole()`**: Only OWNER can change roles. Cannot change own role.
- **`removeMember()`**: OWNER can remove anyone; ADMIN can remove MEMBER only.

### Workspace Controller (`server/src/modules/workspaces/workspaces.controller.ts`)

- **deleteWorkspace**: Broadcasts `WORKSPACE_DELETED` notification to all members via fan-out job. Disconnects all member sockets from channel rooms.
- **createChannel**: Broadcasts `CHANNEL_CREATED` notification to all members.
- **updateMemberRole**: Dispatches `MEMBER_UPDATE` socket event and creates `ROLE_CHANGED` notification.
- **removeWorkspaceMember**: Dispatches `MEMBER_UPDATE` socket, leaves channel rooms, creates `MEMBER_REMOVED` notification.
- **addChannelMembers**: Dispatches `CHANNEL_MEMBER_ADDED` socket event and notification.
- **removeChannelMember**: Dispatches `CHANNEL_MEMBER_REMOVED` socket event and notification.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Workspace CRUD | ✅ | Full create/read/update/delete in service |
| Slug-based routing | ✅ | `findWorkspaceByIdOrSlug` |
| Role hierarchy | ✅ | OWNER > ADMIN > MEMBER enforced |
| Role change | ✅ | `updateMemberRole` with OWNER-only restriction |
| Member add/remove | ✅ | `inviteMemberByUsername`, `removeMember` |
| Socket broadcast on update | ✅ | `dispatchWorkspaceUpdate` |
| Socket broadcast on member change | ✅ | `dispatchMemberUpdate` |
| Unread counts per workspace | ✅ | Aggregated from channel unread counts |
| Workspace deletion notifications | ✅ | Fan-out `WORKSPACE_DELETED` |
| Workspace leave with OWNER check | ✅ | Prevents last OWNER from leaving |
| Channel list via socket events | ❌ | Uses REST polling, not socket events |
| Soft-delete for workspaces | ❌ | Hard delete with cascade |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Create workspace with valid data | Workspace + #general created | Transaction creates both with creator as OWNER | ✅ |
| Create workspace with duplicate slug | 409 conflict | `ConflictError` thrown | ✅ |
| Create workspace with invalid slug format | 400 validation error | Regex validation in schema | ✅ |
| OWNER updates workspace | Changes saved | Permission check passes for OWNER | ✅ |
| ADMIN updates workspace | Changes saved | Permission check passes for ADMIN | ✅ |
| MEMBER updates workspace | 403 forbidden | Permission check rejects | ✅ |
| OWNER deletes workspace | Workspace deleted, notifications sent | Cascade delete, fan-out WORKSPACE_DELETED | ✅ |
| ADMIN tries to delete workspace | 403 forbidden | Only OWNER can delete | ✅ |
| OWNER changes MEMBER to ADMIN | Role updated, notification sent | `updateMemberRole` + ROLE_CHANGED dispatch | ✅ |
| OWNER tries to change own role | 403 forbidden | `memberUserId === userId` check | ✅ |
| ADMIN removes MEMBER | Member removed, notification sent | `removeMember` allows ADMIN to remove MEMBER | ✅ |
| ADMIN tries to remove ADMIN | 403 forbidden | ADMIN cannot remove ADMIN | ✅ |
| ADMIN tries to remove OWNER | 403 forbidden | Cannot remove workspace owner | ✅ |
| Last OWNER tries to leave | 403 forbidden | `countWorkspaceOwners <= 1` check | ✅ |
| MEMBER leaves workspace | Removed from all channels | `leaveWorkspace` + socket room cleanup | ✅ |

---

## Current Flow

```
Create workspace:
  POST /api/workspaces → createWorkspace → transaction:
    1. Validate slug format and uniqueness
    2. Create Workspace (owner = userId, role = OWNER)
    3. Create Conversation #general (PUBLIC, auto-join creator)
  → Return workspace

Delete workspace:
  DELETE /api/workspaces/:id → deleteWorkspace (OWNER only)
  → dispatchWorkspaceUpdate({ action: "DELETED" })
  → Fan-out WORKSPACE_DELETED notifications to all members
  → Leave all channel socket rooms for all members
  → Cascade delete workspace + channels + messages
```

---

## Missing Pieces

```
□ Channel list via socket events (currently REST polling)
□ Soft-delete for workspaces (currently hard delete)
□ Workspace transfer of ownership
□ Workspace analytics (member count, message volume)
□ Archived workspaces
□ Custom workspace roles (beyond OWNER/ADMIN/MEMBER)
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Delete workspace with active members | Notifications sent, sockets disconnected | ✅ |
| Last OWNER tries to leave workspace | 403 "Transfer ownership or delete" | ✅ |
| Remove member from workspace | Removed from all channels, socket rooms left | ✅ |
| Workspace slug changed | Old slug becomes available, URLs break | ⚠️ |
| Member removed from workspace while in channel | Socket leaves all channel rooms | ✅ |
| Workspace with 0 channels | #general always created on creation | ✅ |
| isDeleting flag set during async deletion | Members cannot access workspace | ✅ |

---

## Known Limitations

- Channel list uses REST polling (no socket events) — stale on other clients until next poll.
- Workspace deletion is hard delete with cascade — no undo.
- No workspace transfer of ownership — if last OWNER leaves, workspace is orphaned.
- Role system is fixed (OWNER/ADMIN/MEMBER) — no custom role creation.

---

## Files Inspected

```
server/src/modules/workspaces/workspaces.service.ts
server/src/modules/workspaces/workspaces.controller.ts
server/src/modules/workspaces/workspaces.repository.ts
server/src/modules/workspaces/workspaces.routes.ts
server/src/modules/workspaces/workspaces.schema.ts
server/prisma/schema.prisma
server/src/socket/socket.dispatcher.ts
server/src/socket/handlers/workspace.handler.ts
client/src/modules/workspaces/hooks/useWorkspaces.ts
client/src/modules/workspaces/hooks/useWorkspaceChannels.ts
client/src/modules/workspaces/hooks/useChannelMembers.ts
client/src/modules/workspaces/api/workspaces.api.ts
client/src/modules/workspaces/types/workspace.ts
client/src/modules/workspaces/components/WorkspaceHeader.tsx
client/src/modules/workspaces/components/CreateWorkspaceModal.tsx
client/src/modules/workspaces/components/WorkspaceSettingsModal.tsx
client/src/modules/workspaces/components/CreateChannelModal.tsx
client/src/modules/workspaces/components/MemberListPanel.tsx
client/src/modules/workspaces/components/CustomRoleDropdown.tsx
```
