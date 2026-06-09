# Nexus Database Schema (Phase 1)

> **Last Updated:** 2026-06-09

This document details the exact PostgreSQL database schema for Phase 1 of the Nexus project, implemented via Prisma.

## Core Architectural Decisions

1. **UUIDv7 Primary Keys**: All `id` fields across all tables are `String` storing UUIDv7 strings. This is critical for cursor-based pagination because UUIDv7 is time-ordered (monotonically sortable). We do **not** use `createdAt` for sorting. 
   - *Requirement*: Always generate IDs in the application layer using the `uuidv7` npm package before calling `prisma.model.create()`. Do not use `crypto.randomUUID()` (UUIDv4) or Prisma's default `@default(uuid())` as they break sorting.
   - ⚠️ **Current code uses `createdAt: "desc"` for pagination ordering** — this should be switched to `id` ordering for consistency with the spec.
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
| `deletedAt` | `DateTime?` | | Soft-delete field. When set, the message is considered deleted. Schema + migration applied. No REST endpoint exposes this yet. |
| `createdAt` | `DateTime` | `@default(now())` | Displayed in UI ("sent 2 mins ago"). ⚠️ Currently used for ordering instead of `id`. |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated automatically by Prisma |

**Relations:**
- `conversation Conversation` (cascade delete)
- `user User` (cascade delete)
- `readByMembers ConversationMember[]` via `"ConversationMemberLastRead"`

**Constraints & Indexes:**
- `@@index([conversationId, id])`: Critical for cursor-based pagination. Queries will filter by `conversationId` and order/seek by `id`.

---

## Detailed Logic Handlers

### The `dmPair` Strategy
To prevent duplicate DMs between the same two users (e.g., User A clicks "Message User B" twice, or both message each other simultaneously), we use a deterministic string.
1. Given `userId1` and `userId2`.
2. Sort them alphabetically: `const [u1, u2] = [userId1, userId2].sort()`.
3. Concatenate: `const dmPair = \`${u1}_${u2}\``.
4. On the `Conversation` model, `dmPair` is marked `@unique`. 
5. Prisma `create` will throw a unique constraint violation if a duplicate DM is attempted, and `createOrGetDM` catches this to return the existing conversation.

### Pagination Strategy
Because we use UUIDv7, `Message.id` is sequentially generated based on a timestamp.
API query for history: `GET /conversations/:id/messages?cursor=<messageId>&limit=50`

Current database query:
```prisma
prisma.message.findMany({
  where: { 
    conversationId: id,
    ...(cursor && { id: { lt: cursor } }) 
  },
  take: limit + 1,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },    // ⚠️ Should be { id: 'desc' }
})
```

> ⚠️ **Known issue:** The current implementation uses `createdAt: "desc"` instead of `id: "desc"`. Since UUIDv7 is monotonically ordered by timestamp, ordering by `id` would be equivalent but more correct. This should be fixed.

### Message Editing Logic
The `editMessage` service in `messages.service.ts` enforces:
1. Message must exist (`getMessageById`)
2. Message must not have `deletedAt` set (cannot edit deleted message)
3. `userId` must match message sender (403 Forbidden otherwise)
4. Content is trimmed before update
5. Sets `isEdited: true` on update

### Soft-Delete Architecture
- `deletedAt: DateTime?` on the Message model
- Soft-delete preserves the message row for potential "unsend" or admin recovery
- ⚠️ Current `getMessages` does NOT filter out soft-deleted messages — needs `where: { deletedAt: null }` clause when the delete endpoint is exposed
- The `editMessage` service correctly rejects editing deleted messages

### Message Creation Transaction
`createMessage` now uses a Prisma `$transaction` to atomically:
1. Create the message record
2. Update the conversation's `updatedAt` to now (for sidebar ordering)

This ensures the sidebar always shows the most recently active conversation at the top.
