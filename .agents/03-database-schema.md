# Nexus Database Schema (Phase 1)

> **Last Updated:** 2026-06-11

This document details the exact PostgreSQL database schema for Phase 1 of the Nexus project, implemented via Prisma.

## Core Architectural Decisions

1. **UUIDv7 Primary Keys**: All `id` fields across all tables are `String` storing UUIDv7 strings. This is critical for cursor-based pagination because UUIDv7 is time-ordered (monotonically sortable). We do **not** use `createdAt` for sorting.
   - *Requirement*: Always generate IDs in the application layer using the `uuidv7` npm package before calling `prisma.model.create()`. Do not use `crypto.randomUUID()` (UUIDv4) or Prisma's default `@default(uuid())` as they break sorting.
   - ✅ **FIXED (2026-06-11)**: `getMessages` now uses `id: "desc"` for pagination ordering.
2. **Supabase Auth Separation**: Supabase handles authentication and issues JWTs. The Prisma `User` table mirrors profile data through the Supabase `on_auth_user_created` database trigger in `server/prisma/SUPABASE_QUERIES.sql`, not through Express middleware upserts.

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
| `createdAt` | `DateTime` | `@default(now())` | For display only |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated automatically by Prisma |

**Relations:**
- `conversations ConversationMember[]` — joined conversations
- `messages Message[]` — sent messages

### 2. `Conversation`
Represents a chat container. In Phase 1, this only supports DMs, but the schema allows for future expansion to Channels.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `type` | `ConversationType`| | Enum: `DM` or `CHANNEL` (Phase 1 uses only `DM`) |
| `isPrivate` | `Boolean` | `@default(true)` | True for DMs |
| `name` | `String?` | | Nullable for DMs, used for Channels later |
| `workspaceId` | `String?` | | Nullable in Phase 1 |
| `dmPair` | `String?` | `@unique` | A sorted combination of the two user IDs (e.g., `userA_userB`). Enforces exactly one DM conversation between any pair of users at the database level. |
| `latestMessageId` | `String?` | | Foreign key to the latest Message (used for sidebar preview). Updated atomically via Prisma `$transaction`. |
| `createdAt` | `DateTime` | `@default(now())` | For display only |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated atomically on each new message via Prisma `$transaction` (used for sidebar ordering) |

**Relations:**
- `members ConversationMember[]` (cascade delete)
- `messages Message[]` (cascade delete)

### 3. `ConversationMember`
The junction table linking Users to Conversations. It also tracks the user's unread state for that specific conversation.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `conversationId` | `String` | | Foreign key to `Conversation` |
| `userId` | `String` | | Foreign key to `User` |
| `lastReadMessageId`| `String?` | | Foreign key to `Message.id`. Null if the user hasn't read any messages. Used to calculate the unread badge and read receipt ticks. |
| `joinedAt` | `DateTime` | `@default(now())` | |

**Relations:**
- `conversation Conversation` (cascade delete)
- `user User` (cascade delete)
- `lastReadMessage Message?` via `"ConversationMemberLastRead"`

**Constraints & Indexes:**
- `@@unique([conversationId, userId])`: A user can only join a conversation once.
- `@@index([userId, conversationId])`: Critical for fetching the user's sidebar/inbox list efficiently.

### 4. `Message`
An individual chat message sent within a Conversation.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7. Used as the sorting key and cursor for pagination. |
| `content` | `String` | | The message text |
| `conversationId` | `String` | | Foreign key to `Conversation` |
| `userId` | `String` | | Foreign key to `User` (the sender) |
| `isEdited` | `Boolean` | `@default(false)` | Flag for edited messages. Set to `true` by `editMessage` service. |
| `deletedAt` | `DateTime?` | | Soft-delete field. When set, the message is considered deleted. ✅ Schema + migration + REST endpoint all complete. |
| `createdAt` | `DateTime` | `@default(now())` | Displayed in UI ("sent 2 mins ago"). ✅ `getMessages` uses `id: "desc"` ordering (UUIDv7). |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated automatically by Prisma |

**Relations:**
- `conversation Conversation` (cascade delete)
- `user User` (cascade delete)
- `readByMembers ConversationMember[]` via `"ConversationMemberLastRead"`

**Constraints & Indexes:**
- `@@index([conversationId, id])`: Critical for cursor-based pagination. Queries will filter by `conversationId` and order/seek by `id`.

### 5. `Invite`
Stores secure invite links for various entity types.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `type` | `InviteType` | | Enum: `USER`, `CONVERSATION`, `WORKSPACE`, `CHANNEL` |
| `entityId` | `String` | | The ID of the entity being invited to (user ID, conversation ID, etc.) |
| `token` | `String` | `@unique` | Cryptographically random hex string (32 bytes) |
| `maxUses` | `Int?` | | Null = unlimited. Default in seed: 1. |
| `usedCount` | `Int` | `@default(0)` | Atomic increment via raw SQL `UPDATE ... SET "usedCount" = "usedCount" + 1` |
| `expiresAt` | `DateTime?` | | Default: 7 days from creation |
| `revoked` | `Boolean` | `@default(false)` | Soft-revocation flag |
| `createdBy` | `String` | | User ID of the creator |
| `lastUsedAt` | `DateTime?` | | Timestamp of last consumption |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

---

## Detailed Logic Handlers

### The `dmPair` Strategy
To prevent duplicate DMs between the same two users. See full description in `public-docs/modules/conversations.md`.

### Pagination Strategy
Because we use UUIDv7, `Message.id` is sequentially generated based on a timestamp.
API query for history: `GET /conversations/:id/messages?cursor=<messageId>&limit=50`

> ✅ **FIXED (2026-06-11)**: Now uses `id: "desc"` ordering (UUIDv7) for cursor-based pagination.

### Message Editing Logic
The `editMessage` service in `messages.service.ts` enforces:
1. Message must exist (`getMessageById`)
2. Message must not have `deletedAt` set (cannot edit deleted message)
3. `userId` must match message sender (403 Forbidden otherwise)
4. Content is trimmed before update
5. Sets `isEdited: true` on update
6. ✅ Broadcasts via socket (`message:update` + `conversation:update` if editing latest message)

### Soft-Delete Architecture
- `deletedAt: DateTime?` on the Message model
- ✅ REST endpoint: `DELETE /conversations/:id/messages/:messageId`
- ✅ Socket broadcast: `message:delete` + `conversation:update` (if deleting latest message)
- ✅ **FIXED (2026-06-11)**: `getMessages` now filters `deletedAt: null` — soft-deleted messages are excluded.
- The `editMessage` service correctly rejects editing deleted messages

### Message Creation Transaction
`createMessage` uses a Prisma `$transaction` to atomically:
1. Create the message record
2. Update the conversation's `updatedAt` and `latestMessageId`
3. Update the sender's `lastReadMessageId` on their `ConversationMember`

This ensures the sidebar always shows the most recently active conversation at the top and the sender's sent messages are automatically marked as read.

### Invite System
- **Active Link Rotation**: If an existing active invite (created by the same user within 24 hours) exists, it is reused. Older ones are revoked.
- **Atomic Consumption**: Raw SQL `UPDATE "Invite" SET "usedCount" = "usedCount" + 1` with guard conditions, preventing concurrency-based over-consumption.
- **Domain Resolvers**: Polymorphic resolvers handle different invite types:
  - `userResolver.ts` → calls `createOrGetDM`, returns `CONVERSATION_NEW` domain event
  - `conversationResolver.ts` → adds user to conversation members, returns `CONVERSATION_UPDATE` domain event
  - `workspaceResolver.ts` / `channelResolver.ts` → throw `NOT_IMPLEMENTED` (Phase 2)

---

> **Note:** Documentation updated on 2026-06-11 to include Invite model, update message edit/delete status to ✅, and add `latestMessageId` field.
