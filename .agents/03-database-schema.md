# Nexus Database Schema (Phase 1)

This document details the exact PostgreSQL database schema for Phase 1 of the Nexus project, implemented via Prisma.

## Core Architectural Decisions

1. **UUIDv7 Primary Keys**: All `id` fields across all tables are `String` storing UUIDv7 strings. This is critical for cursor-based pagination because UUIDv7 is time-ordered (monotonically sortable). We do **not** use `createdAt` for sorting. 
   - *Requirement*: Always generate IDs in the application layer using the `uuidv7` npm package before calling `prisma.model.create()`. Do not use `crypto.randomUUID()` (UUIDv4) or Prisma's default `@default(uuid())` as they break sorting.
2. **Supabase Auth Separation**: Supabase handles authentication and issues JWTs. The Prisma `User` table mirrors profile data through the Supabase `on_auth_user_created` database trigger in `server/prisma/SUPABASE_QUERIES.sql`, not through Express middleware upserts.

---

## Models

### 1. `User`
Stores the application profile for users authenticated via Supabase.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 (usually matches Supabase Auth UID if we enforce it, or generated if we decouple). For simplicity, we use the Supabase UID as the Prisma User ID. |
| `email` | `String` | `@unique` | |
| `username` | `String` | | Display name/handle synced from Supabase Auth metadata |
| `avatarUrl` | `String?` | | Optional avatar image URL |
| `createdAt` | `DateTime` | `@default(now())` | For display only |
| `updatedAt` | `DateTime` | `@updatedAt` | Updated automatically by Prisma |

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

### 3. `ConversationMember`
The junction table linking Users to Conversations. It also tracks the user's unread state for that specific conversation.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id` | UUIDv7 |
| `conversationId` | `String` | | Foreign key to `Conversation` |
| `userId` | `String` | | Foreign key to `User` |
| `lastReadMessageId`| `String?` | | Foreign key to `Message.id`. Null if the user hasn't read any messages. Used to calculate the unread badge and read receipt ticks. |
| `joinedAt` | `DateTime` | `@default(now())` | |

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
| `isEdited` | `Boolean` | `@default(false)`| Flag for edited messages |
| `createdAt` | `DateTime` | `@default(now())` | Displayed in UI ("sent 2 mins ago"). Never used for sorting. |

**Constraints & Indexes:**
- `@@index([conversationId, id])`: Critical for cursor-based pagination. Queries will filter by `conversationId` and order/seek by `id`.

---

## Detailed Logic Handlers

### The `dmPair` Strategy
To prevent duplicate DMs between the same two users (e.g., User A clicks "Message User B" twice, or both message each other simultaneously), we use a deterministic string.
1. Given `userId1` and `userId2`.
2. Sort them alphabetically: `const [u1, u2] = [userId1, userId2].sort()`.
3. Concatenate: `const dmPair = ${u1}_${u2}`.
4. On the `Conversation` model, `dmPair` is marked `@unique`. 
5. Prisma `upsert` or `create` will catch the unique constraint violation if a concurrent request tries to create the same DM, returning the existing conversation instead.

### Pagination Strategy
Because we use UUIDv7, `Message.id` is sequentially generated based on a timestamp.
API query for history: `GET /conversations/:id/messages?cursor=<messageId>&limit=50&direction=before`
Database query:
```prisma
prisma.message.findMany({
  where: { 
    conversationId: id,
    // direction=before means older messages
    ...(cursor && { id: { lt: cursor } }) 
  },
  take: limit + 1, // take one extra to determine hasMore
  orderBy: { id: 'desc' }
})
```
