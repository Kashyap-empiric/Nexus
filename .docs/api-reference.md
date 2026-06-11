# Nexus — REST API Reference

> **Last Updated:** 2026-06-11
> **Base URL (Dev):** `http://localhost:4000/api`
> **Base URL (Production):** `https://nexus-server.onrender.com/api`
> **Authentication:** All endpoints require `Authorization: Bearer <JWT>` header except where noted.

---

## 1. Authentication

All authenticated routes require a valid Supabase Auth JWT.

**Header format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**401 Response (all endpoints):**
```json
{ "error": "Missing or invalid authorization header" }
```

Or:
```json
{ "error": "Invalid or expired token" }
```

---

## 2. Endpoints Reference

### 2.1 Health Check

```
GET /health
```

**Auth:** None
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-11T12:00:00.000Z"
}
```

---

### 2.2 Get Current User

```
GET /api/me
```

**Auth:** Required
**Response (200):**
```json
{
  "id": "uuid-v7",
  "email": "user@example.com",
  "username": "alice",
  "avatarUrl": null,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-11T12:00:00.000Z"
}
```

**Response (404 — user not synced yet):**
```json
{ "error": "User not found in the database" }
```

---

### 2.3 List Conversations

```
GET /api/conversations
```

**Auth:** Required
**Query Params:** None
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-v7",
      "type": "DM",
      "isPrivate": true,
      "name": null,
      "dmPair": "userA_id:userB_id",
      "latestMessageId": "uuid-v7",
      "createdAt": "2026-06-04T00:00:00.000Z",
      "updatedAt": "2026-06-11T12:00:00.000Z",
      "members": [
        {
          "id": "uuid-v7",
          "userId": "uuid-v7",
          "lastReadMessageId": "uuid-v7",
          "user": { "id": "uuid-v7", "username": "alice", "avatarUrl": null }
        }
      ],
      "latestMessage": {
        "id": "uuid-v7",
        "userId": "uuid-v7",
        "content": "Hello!",
        "deletedAt": null,
        "createdAt": "2026-06-11T12:00:00.000Z",
        "user": { "username": "alice" }
      },
      "unreadCount": 2
    }
  ]
}
```

**Notes:**
- Conversations are sorted by `updatedAt` descending
- `unreadCount` is computed by counting messages with `id > member.lastReadMessageId` for messages NOT sent by the current user
- `latestMessage` includes content preview for sidebar
- Only DM conversations in Phase 1

---

### 2.4 Get Conversation Details

```
GET /api/conversations/:id
```

**Auth:** Required
**Params:** `id` — UUID of the conversation
**Membership:** Required (user must be a member)
**Response (200):**
```json
{
  "data": {
    "id": "uuid-v7",
    "type": "DM",
    "isPrivate": true,
    "name": null,
    "dmPair": "userA_id:userB_id",
    "createdAt": "...",
    "updatedAt": "...",
    "members": [
      {
        "id": "uuid-v7",
        "userId": "uuid-v7",
        "lastReadMessageId": "uuid-v7",
        "user": { "id": "uuid-v7", "username": "alice", "avatarUrl": null }
      }
    ]
  }
}
```

**Response (403 — not a member):**
```json
{ "error": "Forbidden: You are not an authorised member of this conversation." }
```

---

### 2.5 Create Conversation (DM)

```
POST /api/conversations
```

**Auth:** Required
**Body:**
```json
{
  "targetUserId": "uuid-v7"
}
```

**Validation (`createConversationSchema`):**
- `targetUserId` — must be a valid UUID
- Cannot create DM with yourself (returns 400)

**Response (201 — created):**
```json
{ "data": { /* Conversation object */ } }
```

**Response (200 — already exists):**
```json
{ "data": { /* Conversation object */ } }
```

**Socket events emitted:**
- `conversation:new` to both participants' `user:<userId>` rooms
- Dynamic `socket.join("conversation:{id}")` for both participants

**Notes:**
- Uses `dmPair` strategy to prevent duplicate DMs
- DM conversations have a database trigger enforcing max 2 members

---

### 2.6 Get Messages (Paginated)

```
GET /api/conversations/:conversationId/messages
```

**Auth:** Required
**Params:** `conversationId` — UUID of the conversation
**Query:**
| Param | Type | Default | Description |
|---|---|---|---|
| `cursor` | UUID (optional) | — | Message ID to paginate from (exclusive, returns older messages) |
| `limit` | number (1–100) | 50 | Max messages to return |

**Membership:** Required
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-v7",
      "content": "Hello!",
      "conversationId": "uuid-v7",
      "userId": "uuid-v7",
      "isEdited": false,
      "deletedAt": null,
      "createdAt": "2026-06-11T12:00:00.000Z",
      "updatedAt": "2026-06-11T12:00:00.000Z",
      "user": { "id": "uuid-v7", "username": "alice", "avatarUrl": null }
    }
  ],
  "nextCursor": "uuid-v7-or-null"
}
```

**Notes:**
- ⚠️ Currently orders by `createdAt: "desc"` instead of `id: "desc"` (known bug)
- ⚠️ Does NOT filter out soft-deleted messages (`deletedAt: null`) (known bug)
- `nextCursor` is null when there are no more messages

---

### 2.7 Create Message

```
POST /api/conversations/:conversationId/messages
```

**Auth:** Required
**Body:**
```json
{
  "content": "Message text here"
}
```

**Validation (`createMessageBodySchema`):**
- `content` — trimmed, min 1 char, max 2000 chars

**Rate limited:** Yes (`messageLimiter` — 20 msg/60s)
**Membership:** Required
**Response (201):**
```json
{
  "data": {
    "id": "uuid-v7",
    "content": "Message text here",
    "conversationId": "uuid-v7",
    "userId": "uuid-v7",
    "isEdited": false,
    "deletedAt": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": { "id": "uuid-v7", "username": "alice", "avatarUrl": null }
  }
}
```

**Socket events emitted:**
- `message:new` to `conversation:{id}` room
- `conversation:update` to `conversation:{id}` room (with `latestMessage`, `updatedAt`, `latestMessageId`)

**Notes:**
- Message ID is generated with `uuidv7()` in the application layer
- Prisma `$transaction` atomically: creates message, updates conversation metadata, updates sender's `lastReadMessageId`

---

### 2.8 Edit Message

```
PATCH /api/conversations/:conversationId/messages/:messageId
```

**Auth:** Required
**Body:**
```json
{
  "content": "Updated message text"
}
```

**Validation (`updateMessageBodySchema`):**
- `content` — trimmed, min 1 char, max 2000 chars

**Rate limited:** Yes (`messageLimiter`)
**Membership:** Required
**Business logic:**
- Message must exist
- Message must NOT have `deletedAt` set
- User must be the message owner
- Sets `isEdited: true` on update

**Response (200):**
```json
{
  "data": { /* Updated Message object with isEdited: true */ }
}
```

**Error responses:**
- `403` — `{ "error": "Forbidden" }` (not message owner)
- `400` — `{ "error": "Message not found." }`
- `400` — `{ "error": "Cannot edit a deleted message." }`

**Socket events emitted:**
- `message:update` to `conversation:{id}` room
- `conversation:update` to `conversation:{id}` room (only if editing the latest message)

---

### 2.9 Delete Message (Soft Delete)

```
DELETE /api/conversations/:conversationId/messages/:messageId
```

**Auth:** Required
**Body:** None
**Membership:** Required
**Business logic:**
- Message must exist
- Message must NOT already have `deletedAt` set
- User must be the message owner
- Sets `deletedAt: new Date()` on update
- If this was the `latestMessageId`, computes the next latest message and updates the conversation

**Response (200):**
```json
{
  "data": { /* Message object with deletedAt set */ }
}
```

**Error responses:**
- `403` — `{ "error": "Forbidden" }`
- `400` — `{ "error": "Message not found." }`
- `400` — `{ "error": "Message is already deleted." }`

**Socket events emitted:**
- `message:delete` to `conversation:{id}` room (with `deletedAt` field)
- `conversation:update` to `conversation:{id}` room (if deleting the latest message)

---

### 2.10 Mark Conversation as Read

```
PATCH /api/conversations/:id/read
```

**Auth:** Required
**Body:**
```json
{
  "messageId": "uuid-v7"
}
```

**Validation (`markReadSchema`):**
- `messageId` — must be a valid UUID

**Membership:** Required
**Response (200):**
```json
{ "success": true }
```

**Error responses:**
- `404` — `{ "error": "Message not found" }`
- `400` — `{ "error": "Message does not belong to this conversation" }`

**Socket events emitted:**
- `message:read` to `conversation:{id}` room with `{ conversationId, userId, lastReadMessageId }`

---

### 2.11 Search Users

```
GET /api/users/search?q=alice
```

**Auth:** Required
**Query:**
| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | `""` | Search query (matched against username and email, case-insensitive) |

**Response (200):**
```json
{
  "data": [
    { "id": "uuid-v7", "username": "alice", "avatarUrl": null },
    { "id": "uuid-v7", "username": "alice_smith", "avatarUrl": null }
  ]
}
```

**Notes:**
- Excludes the current user from results
- Limited to 10 results
- Uses Prisma `mode: "insensitive"` for case-insensitive matching

---

### 2.13 Generate Invite

```
POST /api/invites/generate
```

**Auth:** Required
**Body:**
```json
{
  "type": "USER",
  "entityId": "uuid-v7"
}
```

**Validation:**
- `type` — one of: `USER`, `CONVERSATION`, `WORKSPACE`, `CHANNEL`
- `entityId` — required for all types except `USER` (implicitly the inviter's ID)

**Type-specific rules:**

| Type | `entityId` | Behavior |
|---|---|---|
| `USER` | Optional (defaults to inviter) | Generates an invite to create a DM with the inviter |
| `CONVERSATION` | Required | Generates an invite to join a conversation (DM invites blocked) |
| `WORKSPACE` | Required | Not yet implemented |
| `CHANNEL` | Required | Not yet implemented |

**Active Link Rotation Policy:**
- If an active invite (same type, same entity, same creator, not revoked, not expired) exists and was created < 24 hours ago, it is **reused**
- If an active invite exists but is > 24 hours old, it is **revoked** and a new one is created

**Response (200):**
```json
{
  "invitePath": "/invite?token=8f3a...",
  "token": "8f3a...",
  "expiresAt": "2026-06-18T12:00:00.000Z"
}
```

---

### 2.14 Resolve Invite

```
POST /api/invites/resolve
```

**Auth:** Required
**Body:**
```json
{
  "token": "8f3a..."
}
```

**Business logic (inside Prisma `$transaction`):**
1. Fetch invite by token
2. Validate: not revoked, not expired, not maxed out
3. Resolve using type-specific resolver:
   - **USER:** Creates a DM between inviter and acceptor
   - **CONVERSATION:** Adds acceptor as a member
   - **WORKSPACE/CHANNEL:** Not implemented
4. Atomically increment `usedCount` via raw SQL

**Response (200):**
```json
{
  "redirectUrl": "/conversations/uuid-v7"
}
```

**Socket events emitted:**
- `CONVERSATION_UPDATE` to conversation room (for CONVERSATION invites)
- `conversation:new` to participants' `user:<userId>` rooms (for USER invites — new DM created)

---

## 3. Request/Response Schema Reference

### 3.1 Validation Middleware

All request validation is handled by `validate.ts` middleware using Zod schemas. Failed validation returns:

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": { "content": ["Message cannot be empty"] },
    "formErrors": []
  }
}
```

**Status:** `400 Bad Request`

### 3.2 Rate Limit Response

When rate limited, all endpoints return:

**Status:** `429 Too Many Requests`
**Header:** `Retry-After: <seconds>`
**Body:**
```json
{ "error": "You are sending messages too quickly." }
```

### 3.3 Generic Error Response

Unhandled errors:

**Status:** `500 Internal Server Error`
**Body:**
```json
{ "error": "Internal server error" }
```

---

## 4. Endpoint Summary

| # | Method | Route | Auth | Rate Limited | Socket Events |
|---|---|---|---|---|---|
| 1 | `GET` | `/health` | No | No | None |
| 2 | `GET` | `/api/me` | Yes | General | None |
| 3 | `GET` | `/api/conversations` | Yes | General | None |
| 4 | `GET` | `/api/conversations/:id` | Yes + Member | General | None |
| 5 | `POST` | `/api/conversations` | Yes | General | `conversation:new`, dynamic room join |
| 6 | `GET` | `/api/conversations/:id/messages` | Yes + Member | General | None |
| 7 | `POST` | `/api/conversations/:id/messages` | Yes + Member | Message | `message:new`, `conversation:update` |
| 8 | `PATCH` | `/api/conversations/:id/messages/:msgId` | Yes + Member | Message | `message:update`, `conversation:update` |
| 9 | `DELETE` | `/api/conversations/:id/messages/:msgId` | Yes + Member | General | `message:delete`, `conversation:update` |
| 10 | `PATCH` | `/api/conversations/:id/read` | Yes + Member | General | `message:read` |
| 11 | `GET` | `/api/users/search?q=` | Yes | General | None |
| 12 | `POST` | `/api/invites/generate` | Yes | General | None |
| 13 | `POST` | `/api/invites/resolve` | Yes | General | `CONVERSATION_UPDATE` / `conversation:new` |

**Rate Limiter Config (defaults):**
- **General:** 1000 requests per 15 minutes per IP
- **Message:** 20 requests per 1 minute per IP
- Configurable via env vars: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `MESSAGE_RATE_LIMIT_WINDOW_MS`, `MESSAGE_RATE_LIMIT_MAX`
