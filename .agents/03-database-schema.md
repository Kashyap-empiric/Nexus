# Nexus Database Schema (Phase 1 + Workspaces)

> **Last Updated:** 2026-06-12

This document details the exact PostgreSQL database schema for the Nexus project, implemented via Prisma.

## Core Architectural Decisions

1. **UUIDv7 Primary Keys**: All `id` fields across all tables are `String` storing UUIDv7 strings. This is critical for cursor-based pagination because UUIDv7 is time-ordered (monotonically sortable). We do **not** use `createdAt` for sorting.
   - *Requirement*: Always generate IDs in the application layer using the `uuidv7` npm package before calling `prisma.model.create()`. Do not use `crypto.randomUUID()` (UUIDv4) or Prisma's default `@default(uuid())` as they break sorting.
   - ✅ **FIXED**: `getMessages` now uses `id: "desc"` for pagination ordering.
2. **Supabase Auth Separation**: Supabase handles authentication and issues JWTs. The Prisma `User` table mirrors profile data through the Supabase `on_auth_user_created` database trigger, not through Express middleware upserts.

---

## Models

### 1. `User`
Stores the application profile for users authenticated via Supabase.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 (matches Supabase Auth UID) |
| `email` | `String` | `@unique` | |
| `username` | `String` | | Display name/handle synced from Supabase Auth metadata |
| `avatarUrl` | `String?` | | Optional avatar image URL |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:**
- `conversations ConversationMember[]` — joined conversations/channels
- `messages Message[]` — sent messages
- `invites Invite[]` — created invites
- `workspaces WorkspaceMember[]` — workspace memberships
- `ownedWorkspaces Workspace[]` — workspaces owned by this user (via `"WorkspaceOwner"`)

### 2. `Conversation`
Represents a chat container. Supports both DMs and Channels within workspaces.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `type` | `ConversationType`| | Enum: `DM` or `CHANNEL` |
| `isPrivate` | `Boolean` | `@default(true)` | True for DMs and private channels |
| `name` | `String?` | | Nullable for DMs, channel name for channels |
| `workspaceId` | `String?` | | FK to Workspace for channels, null for DMs |
| `dmPair` | `String?` | `@unique` | Sorted combination of two user IDs (e.g., `userA_userB`). Enforces exactly one DM between any pair. |
| `latestMessageId` | `String?` | | FK to the latest Message (sidebar preview). Updated atomically via Prisma `$transaction`. |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated atomically on each new message (sidebar ordering) |

**Relations:**
- `members ConversationMember[]` (cascade delete)
- `messages Message[]` (cascade delete)
- `workspace Workspace?` — parent workspace for channels (cascade delete)

### 3. `ConversationMember`
Junction table linking Users to Conversations. Tracks unread state and read receipts.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `conversationId` | `String` | | FK to `Conversation` |
| `userId` | `String` | | FK to `User` |
| `lastReadMessageId`| `String?` | | FK to `Message.id`. Null if user hasn't read anything. Used for unread badges and read receipts. |
| `joinedAt` | `DateTime` | `@default(now())` | |

**Relations:**
- `conversation Conversation` (cascade delete)
- `user User` (cascade delete)
- `lastReadMessage Message?` via `"ConversationMemberLastRead"`

**Constraints & Indexes:**
- `id String @id @default(cuid())`: Simple primary key (matches production schema for backward compatibility)
- `@@unique([conversationId, userId])`: Unique constraint preventing duplicate memberships
- `@@index([userId, conversationId])`: For fetching user's inbox/sidebar list

> **Note:** The composite `@@id([conversationId, userId])` was intentionally avoided to prevent a destructive migration on production. The `@@unique` constraint achieves the same uniqueness guarantee while keeping the existing `id` PK intact.

### 4. `Message`
An individual chat message sent within a Conversation.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7. Used as the sorting key and cursor for pagination. |
| `content` | `String` | | The message text |
| `conversationId` | `String` | | FK to `Conversation` |
| `userId` | `String` | | FK to `User` (sender) |
| `isEdited` | `Boolean` | `@default(false)` | Flag for edited messages |
| `deletedAt` | `DateTime?` | | Soft-delete field. When set, message is considered deleted. |
| `createdAt` | `DateTime` | `@default(now())` | Displayed in UI |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:**
- `conversation Conversation` (cascade delete)
- `user User` (cascade delete)
- `readByMembers ConversationMember[]` via `"ConversationMemberLastRead"`
- `latestIn Conversation[]` via `"ConversationLatestMessage"`

**Constraints & Indexes:**
- `@@index([conversationId, id])`: Critical for cursor-based pagination

### 5. `Invite`
Stores secure invite links for various entity types.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `type` | `InviteType` | | Enum: `USER`, `CONVERSATION`, `WORKSPACE`, `CHANNEL` |
| `entityId` | `String` | | ID of the entity being invited to |
| `token` | `String` | `@unique` | Cryptographically random hex string (32 bytes) |
| `maxUses` | `Int?` | | Null = unlimited |
| `usedCount` | `Int` | `@default(0)` | Atomic increment via raw SQL |
| `expiresAt` | `DateTime?` | | Default: 7 days |
| `revoked` | `Boolean` | `@default(false)` | Soft-revocation flag |
| `createdBy` | `String` | | User ID of the creator |
| `lastUsedAt` | `DateTime?` | | |
| `createdAt` | `DateTime` | `@default(now())` | |

**Indexes:**
- `@@index([token])`
- `@@index([type, entityId])`

### 6. `Workspace` — NEW
A team workspace that contains channels and members.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `name` | `String` | | Display name |
| `slug` | `String` | `@unique` | URL-friendly identifier (used in routing) |
| `imageUrl` | `String?` | | Optional workspace avatar |
| `ownerId` | `String` | | FK to User (workspace creator) |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:**
- `owner User` via `"WorkspaceOwner"` (cascade delete)
- `members WorkspaceMember[]` — workspace memberships
- `channels Conversation[]` — channels within this workspace (type=CHANNEL)

### 7. `WorkspaceMember` — NEW
Junction table for workspace membership.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `workspaceId` | `String` | | FK to `Workspace` |
| `userId` | `String` | | FK to `User` |
| `role` | `WorkspaceRole` | `@default(MEMBER)` | Enum: `OWNER`, `ADMIN`, `MEMBER` |
| `joinedAt` | `DateTime` | `@default(now())` | |

**Relations:**
- `workspace Workspace` (cascade delete)
- `user User` (cascade delete)

**Constraints & Indexes:**
- `@@id([workspaceId, userId])`: Composite primary key
- `@@index([userId])`:

---

## Enums

### `ConversationType`
```prisma
enum ConversationType {
  DM
  CHANNEL
}
```

### `InviteType`
```prisma
enum InviteType {
  USER
  CONVERSATION
  WORKSPACE
  CHANNEL
}
```

### `WorkspaceRole`
```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}
```

---

## Detailed Logic Handlers

### The `dmPair` Strategy
Prevents duplicate DMs between the same two users. A sorted, concatenated pair (`userA_userB`) is used as a unique constraint. `createOrGetDM` attempts creation first, catches `P2002` on race conditions, and falls back to returning the existing conversation.

### Pagination Strategy
UUIDv7 `Message.id` is time-ordered. API query: `GET /conversations/:id/messages?cursor=<messageId>&limit=50`. Uses `id: "desc"` ordering.

### Message Creation Transaction
Uses a Prisma `$transaction` to atomically:
1. Create the message record
2. Update the conversation's `updatedAt` and `latestMessageId`
3. Upsert the sender's `lastReadMessageId` on their `ConversationMember`

### Invite System
- **Active Link Rotation**: Existing active invite (same creator + same entity within 24h) is reused
- **Atomic Consumption**: Raw SQL `UPDATE "Invite" SET "usedCount" = "usedCount" + 1` with guard conditions
- **Domain Resolvers**: Polymorphic resolvers for USER, CONVERSATION, WORKSPACE types
- WORKSPACE and CHANNEL resolvers have full implementations

### Workspace Channel Creation
When a new public channel is created, all workspace members are automatically added as `ConversationMember` records, ensuring everyone has access to the channel.

### Channel Access Control
Non-private channels in a workspace are accessible to any workspace member (checked via `checkConversationAccess` in `auth.repository.ts`). Private channels require explicit membership.
