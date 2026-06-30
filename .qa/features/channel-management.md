# Feature: Channel Management

## Goal

Allow workspace members to create, update, and delete channels; manage channel visibility (public/private); and modify channel settings.

---

## Current Status

```
Implemented
```

Full channel CRUD with public/private visibility, naming, description, and deletion. Channel management permissions are enforced by workspace role and channel creator status.

---

## High-Level Summary

- Channels are modeled as `Conversation` records with `type: CHANNEL` — reusing all message infrastructure.
- Public channels auto-join all workspace members on creation.
- Private channels require explicit member addition.
- Channel creation, update, and deletion all broadcast via socket events.
- `#general` channel cannot be deleted.
- Visibility toggle currently one-way only (PUBLIC→PRIVATE possible in code, PRIVATE→PUBLIC requires manual re-add).
- Channel naming limited to 80 characters.

---

## Code Locations

```
Backend

server/src/modules/workspaces/workspaces.service.ts     — Channel create/update/delete logic
server/src/modules/workspaces/workspaces.controller.ts  — Channel request handlers
server/src/modules/workspaces/workspaces.repository.ts  — Channel DB queries
server/src/modules/workspaces/workspaces.schema.ts      — Channel validation schemas

Frontend

client/src/modules/workspaces/components/CreateChannelModal.tsx          — Create channel modal
client/src/modules/workspaces/components/ChannelSettingsModal.tsx         — (moved?) Not found
client/src/modules/conversations/components/ChannelSettingsModal.tsx      — Channel settings UI
client/src/modules/chat/components/ActiveConversation.tsx                — Channel header
```

---

## Database

```prisma
model Conversation {
  id              String          @id
  type            ConversationType @default(DM)
  name            String?
  description     String?
  workspaceId     String?
  visibility      ChannelVisibility @default(PUBLIC)
  isPrivate       Boolean         @default(false)
  createdBy       String?
  // ... other fields
}

enum ConversationType {
  DM
  CHANNEL
}

enum ChannelVisibility {
  PUBLIC
  PRIVATE
}
```

- Channels are `Conversation` records where `type === "CHANNEL"` and `workspaceId` is set.
- `visibility` field: PUBLIC (any workspace member can view/send) or PRIVATE (explicit membership required).
- `isPrivate` is a redundant boolean mirroring `visibility === "PRIVATE"`.
- `name` field stores the channel name (e.g., "general", "random").

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/workspaces/:id/channels` | Required | Create channel |
| PATCH | `/api/workspaces/:id/channels/:channelId` | Required | Update channel |
| DELETE | `/api/workspaces/:id/channels/:channelId` | Required | Delete channel |

### Request Validation

```typescript
createChannelBodySchema = z.object({
  name: z.string().min(1, { message: "Channel name is required" }).max(80),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

updateChannelBodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
}).refine((data) => data.name || data.description || data.visibility, {
  message: "At least one field must be provided",
});
```

### Permissions

- Create channel: any workspace member.
- Rename channel: OWNER, ADMIN, or channel creator.
- Change visibility: OWNER or ADMIN only.
- Delete channel: OWNER or ADMIN only.
- `#general` channel cannot be deleted.

---

## Backend Implementation

### Channel Operations (`server/src/modules/workspaces/workspaces.service.ts`)

- **`createChannel()`**:
  1. Validates workspace membership.
  2. PUBLIC: auto-joins all workspace members (`memberUserIds` from workspace).
  3. PRIVATE: only creator is a member initially.
  4. Returns created channel with members.
- **`updateChannel()`**:
  1. Validates workspace membership and channel existence.
  2. Rename: OWNER, ADMIN, or creator (`canManageChannel` check).
  3. Visibility change: OWNER or ADMIN only.
  4. Updates both `visibility` and `isPrivate`.
- **`deleteChannel()`**:
  1. OWNER or ADMIN only.
  2. `#general` channel deletion blocked.
  3. Hard delete cascades to messages.

### Socket Dispatch

- Channel creation: `dispatchConversationNew()` — auto-joins all members and broadcasts.
- Channel update: `dispatchChannelUpdate({ action: "UPDATED" })` to workspace room.
- Channel deletion: `dispatchChannelUpdate({ action: "DELETED" })` to workspace room.

---

## Frontend Implementation

### CreateChannelModal (`client/src/modules/workspaces/components/CreateChannelModal.tsx`)

- Form with channel name (auto-generates slug-style name) and visibility toggle.
- Calls `POST /api/workspaces/:id/channels`.

### ChannelSettingsModal (`client/src/modules/conversations/components/ChannelSettingsModal.tsx`)

- Channel name, description, visibility settings.
- Delete channel option with confirmation.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Create channel (PUBLIC) | ✅ | Auto-joins all workspace members |
| Create channel (PRIVATE) | ✅ | Only creator initially |
| Update channel name | ✅ | `updateChannel` in service |
| Update channel description | ✅ | `updateChannel` accepts description |
| Update channel visibility | ✅ | `visibility` field updated |
| Delete channel | ✅ | OWNER/ADMIN only, #general protected |
| Socket broadcast on create | ✅ | `dispatchConversationNew` |
| Socket broadcast on update | ✅ | `dispatchChannelUpdate` |
| Socket broadcast on delete | ✅ | `dispatchChannelUpdate` |
| CRUD validation | ✅ | Zod schemas for all endpoints |
| Channel list polling | ❌ | Uses REST GET, not socket events |
| Visibility migration (PRIVATE→PUBLIC) | ❌ | Requires manual member re-add |
| Channel archiving | ❌ | Only hard delete available |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| MEMBER creates PUBLIC channel | Channel created, all members auto-joined | `createChannel` with bulk insert | ✅ |
| MEMBER creates PRIVATE channel | Channel created, only creator joined | PRIVATE visibility, single member | ✅ |
| OWNER renames channel | Name updated, socket broadcast | `updateChannel` with `canManageChannel` | ✅ |
| ADMIN renames channel | Name updated | `canManageChannel` returns true for ADMIN | ✅ |
| Creator renames own channel | Name updated | `canManageChannel` returns true for creator | ✅ |
| MEMBER tries to rename channel | 403 forbidden | `canManageChannel` returns false | ✅ |
| ADMIN changes PUBLIC→PRIVATE | Visibility updated | `visibility` set to PRIVATE | ✅ |
| MEMBER tries to change visibility | 403 forbidden | Only ADMIN/OWNER check | ✅ |
| ADMIN deletes #general | 403 forbidden | `name === "general"` check | ✅ |
| ADMIN deletes regular channel | Channel deleted, socket broadcast | `deleteChannel` cascades | ✅ |
| MEMBER tries to delete channel | 403 forbidden | Only ADMIN/OWNER check | ✅ |

---

## Current Flow

```
Create channel:
  POST /api/workspaces/:id/channels → createChannel
  → Verify workspace membership
  → If PUBLIC: collect all workspace member IDs
  → Create Conversation with type=CHANNEL, visibility, members
  → dispatchConversationNew (socket: auto-join + broadcast)
  → Enqueue CHANNEL_CREATED notifications
  → Return channel

Update channel:
  PATCH /api/workspaces/:id/channels/:channelId → updateChannel
  → Verify permissions
  → Update name/description/visibility
  → dispatchChannelUpdate({ action: "UPDATED" })
  → Return updated channel
```

---

## Missing Pieces

```
□ Channel list delivered via socket events (currently REST polling)
□ PRIVATE→PUBLIC visibility migration with re-join
□ Channel archiving (replace hard delete)
□ Channel topic/purpose field (separate from description)
□ Slow mode (rate limit per-user per-channel)
□ Channel templates
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Create channel with name "general" | Allowed (but can't delete later) | ⚠️ |
| Create channel with empty name | Zod validation rejects | ✅ |
| Create PUBLIC channel with 1000 members | Bulk insert for all members | ⚠️ |
| Update channel to duplicate name | Not validated (duplicate names allowed) | ❌ |
| Delete channel with pinned messages | Cascade deletes pins | ✅ |

---

## Known Limitations

- Channel list uses REST polling (no socket events) — other clients see stale channel lists.
- Visibility toggle is not reversible (PRIVATE→PUBLIC) without manually re-adding all workspace members.
- Channel name uniqueness is not enforced — multiple channels can have the same name.
- No channel archiving — deletion is permanent with cascade.
- No slow mode or channel-specific rate limits.

---

## Files Inspected

```
server/src/modules/workspaces/workspaces.service.ts
server/src/modules/workspaces/workspaces.controller.ts
server/src/modules/workspaces/workspaces.repository.ts
server/src/modules/workspaces/workspaces.schema.ts
server/prisma/schema.prisma
server/src/socket/socket.dispatcher.ts
client/src/modules/workspaces/components/CreateChannelModal.tsx
client/src/modules/conversations/components/ChannelSettingsModal.tsx
```
