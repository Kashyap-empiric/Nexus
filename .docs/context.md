# Nexus: Project Context

> **Last Updated:** 2026-06-11
> **Status:** Active build (Phase 1 core features complete — message editing, soft-deletion, invite system, and real-time socket architecture all implemented).

---

## 1. Project Overview

Nexus is a real-time messaging and collaboration platform, built as a Slack-like product.

Phase 1 establishes the core messaging foundation: authentication, direct messaging, real-time delivery, message persistence, read receipts, user presence (Redis-backed dual-write presence store with in-memory fallback, multi-tab support), message editing and deletion, and a secure invite system.

---

## 2. Features

### Phase 1 (current)

| Feature | Description | Status |
|---|---|---|
| Authentication | Email/password registration and login via Supabase Auth. Session managed by Supabase SDK. | ✅ Complete |
| Direct Messaging | Private 1-to-1 conversations between users. `dmPair` deduplication strategy. DB trigger enforces 2-member limit. | ✅ Complete |
| Message Persistence | Messages stored in PostgreSQL with UUIDv7 IDs, retrievable as paginated history. | ✅ Complete |
| Real-time Delivery | Messages delivered instantly via Socket.io rooms. Dual path: Socket `message:send` + REST fallback `POST /messages`. | ✅ Complete |
| Message Editing | ✅ Service + REST endpoint exposed. Broadcasts `message:update` + `conversation:update`. ⚠️ `editMessage` still has non-transactional reads. | ✅ Complete (with debt) |
| Message Soft-Delete | ✅ Schema, migration, REST endpoint, socket broadcast. Race condition in `deleteMessage` ✅ **FIXED** (transactional compute of `nextLatestMessageId`). | ✅ Complete |
| Read Receipts | Tracked using `lastReadMessageId` on `ConversationMember`. Broadcasts `message:read` via socket. | ✅ Complete |
| Presence | **Fully implemented.** Redis-backed `presenceStore.ts` with in-memory fallback. Multi-tab handling via socket ID sets. `user:online` / `user:offline` / `presence:initial` all wired. `PresenceIndicator` component. | ✅ Complete |
| Invite System | Secure deep-linked invites supporting USER and CONVERSATION types. 24h active link rotation, atomic consumption. | ✅ Complete |
| Socket Architecture | 11 events, typed dispatcher, auth + rate limiting middleware, room management, comprehensive documentation. | ✅ Complete |

### Phase 2 (planned)

Workspaces, RBAC, public channels, private channels, emoji reactions, rich text formatting.

### Phase 3 (planned)

File uploads, full-text search, background jobs (BullMQ), WebRTC voice/video.

---

## 3. Architecture

Nexus uses a monorepo structure with a decoupled frontend and backend.

- **Client:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Server:** Express.js (TypeScript, Socket.io)
- **Database:** Supabase PostgreSQL accessed via Prisma ORM
- **Auth:** Supabase Auth (JWT-based, session managed by SDK)
- **Presence:** Redis key-value (dual-write with in-memory fallback)
- **Hosting:** Render (server, manual web service) + Vercel (client)
- **Deploy:** Manual via Render Dashboard + Vercel git integration

See [architecture.md](./architecture.md) for the full layer breakdown and decisions.
See [socket.md](./socket.md) for complete socket event documentation.
See [data-flow.md](./data-flow.md) for REST and WebSocket flow details.

---

## 4. Folder Structure

```
nexus/
├── client/               # Next.js 16 frontend
│   └── src/app/          # App Router root (layouts, pages, components)
├── server/               # Express.js + Socket.io backend
│   └── src/socket/       # Socket.io infrastructure (handlers, middleware, dispatcher)
├── .docs/                # Project documentation (this folder)
│   ├── socket.md         # Comprehensive socket event documentation
│   ├── AS_IS_ARCHITECTURE.md
│   ├── TECHNICAL_DEBT.md
│   ├── public-docs/      # Public-facing documentation
│   │   └── modules/      # Per-module docs
├── .agents/              # Agent instruction and context files
├── NEXUS_SLACK_CLONE.md  # Master project specification
└── .gitignore
```

See [file-structure.md](./public-docs/file-structure.md) for the full annotated file tree.

---

## 5. Environment Variables

These are the variables required to run the project. Values are never committed — use `.env.local` (client) and `.env` (server).

### Client (`client/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_API_URL` | Base URL of the Express server |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL |

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (used by Prisma) |
| `SUPABASE_URL` | Supabase project URL (used to fetch the JWKS public keys) |
| `REDIS_URL` | Redis connection string (`redis://...` or `rediss://...`) |
| `PORT` | Port the Express server listens on |
| `CLIENT_URL` | Allowed CORS origin (Next.js client URL) |

---

## 6. Database Schema

Core Phase 1 entities:

| Table | Purpose |
|---|---|
| `users` | Authenticated users, synced from Supabase Auth |
| `conversations` | DMs (Phase 1) and Channels (Phase 2). Type field: `DM` or `CHANNEL`. |
| `conversation_members` | Junction table: user-to-conversation membership. Holds `lastReadMessageId` for read receipts. |
| `messages` | All messages, linked to a conversation and a user. Ordered by `id` ASC (UUIDv7). Supports soft-delete (`deletedAt`) and edit tracking (`isEdited`). |
| `invites` | Secure invite tokens with type, entity reference, usage tracking, expiration, and revocation. |

Phase 2 will add: `workspaces`, `workspace_members`, `reactions`.

Key indexes:
- `conversation_members(conversation_id, user_id)`
- `messages(conversation_id, id)`

See the ER diagram in [architecture.md](./architecture.md#4-database-schema).

---

## 7. API List

### REST Endpoints (Phase 1)

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/me` | Yes | Returns current Prisma user for a valid Supabase JWT |
| `GET` | `/api/conversations` | Yes | List all DMs for the current user |
| `GET` | `/api/conversations/:id` | Yes | Get single conversation with members |
| `POST` | `/api/conversations` | Yes | Create a new DM conversation |
| `GET` | `/api/conversations/:id/messages` | Yes | Fetch message history (cursor-based pagination) |
| `POST` | `/api/conversations/:id/messages` | Yes | Send a new message (REST fallback) |
| `PATCH` | `/api/conversations/:id/messages/:messageId` | Yes | Edit a message |
| `DELETE` | `/api/conversations/:id/messages/:messageId` | Yes | Soft-delete a message |
| `PATCH` | `/api/conversations/:id/read` | Yes | Update `lastReadMessageId` |
| `GET` | `/api/users` | Yes | List all users |
| `GET` | `/api/users/search?q=` | Yes | Search users |
| `POST` | `/api/invites/generate` | Yes | Generate an invite link |
| `POST` | `/api/invites/resolve` | Yes | Resolve an invite token |

All authenticated routes expect `Authorization: Bearer <JWT>` header.

### Socket.io Events (Phase 1)

**Client to Server:**

| Event | Payload | Description |
|---|---|---|
| `message:send` | `{ tempId, conversationId, content }` | Send a message (primary path) |

**Server to Client:**

| Event | Payload | Description |
|---|---|---|
| `message:new` | `Message` object | New message broadcast to conversation room |
| `message:update` | `Message` object | Edited message broadcast to conversation room |
| `message:delete` | `Message` object (with `deletedAt`) | Soft-deleted message broadcast to room |
| `message:read` | `{ conversationId, userId, lastReadMessageId }` | Read receipt broadcast to conversation room |
| `user:online` | `{ userId }` | User came online (first socket opened) |
| `user:offline` | `{ userId }` | User went offline (all sockets closed) |
| `presence:initial` | `{ userIds }` | Snapshot of all online users, sent on connect |
| `conversation:new` | `Conversation` object | New conversation created |
| `conversation:update` | `{ conversation: metadata }` | Conversation metadata updated (latestMessage, updatedAt) |

For detailed documentation of each event including flow diagrams, see [socket.md](./socket.md#2-socket-events-reference).

---

## 8. Known Limitations

| Limitation | Details |
|---|---|
| ~~Cursor pagination orders by `createdAt`~~ | ✅ **FIXED** — Now uses `id: "desc"` (UUIDv7) for monotonic-safe cursor pagination |
| ~~Soft-deleted messages not filtered~~ | ✅ **FIXED** — `getMessages` now filters `deletedAt: null` |
| ~~Race condition in deleteMessage~~ | ✅ **FIXED** — `nextLatestMessageId` computed inside Prisma `$transaction` with `tx.message.findFirst` |
| Non-transactional reads in editMessage | ⚠️ `getMessageById` called outside Prisma `$transaction` in `editMessage` — still unresolved |
| No rate-limit env config | REST rate limiters use hardcoded defaults |
| No Redis Pub/Sub adapter | Single Socket.io instance cannot scale horizontally |
| DM only (no channels) | No channels or workspaces until Phase 2 |
| Typing indicators not implemented | `typing:start` and `typing:stop` defined but not wired |
