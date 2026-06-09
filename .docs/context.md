# Nexus: Project Context

> **Last Updated:** 2026-06-09
> **Status:** Active build (Phase 1 ~90% complete — presence integration remaining).

---

## 1. Project Overview

Nexus is a real-time messaging and collaboration platform, built as a Slack-like product.

Phase 1 establishes the core messaging foundation: authentication, direct messaging, real-time delivery, message persistence, read receipts, and user presence (Redis-based presence tracking not yet wired). All subsequent phases build on top of this foundation.

---

## 2. Features

### Phase 1 (current)

| Feature | Description |
|---|---|
| Authentication | Email/password registration and login via Supabase Auth. Session managed by Supabase SDK. |
| Direct Messaging | Private 1-to-1 conversations between users. DM conversations must have exactly 2 members. |
| Message Persistence | Messages stored in PostgreSQL, retrievable as paginated history. |
| Real-time Delivery | Messages delivered instantly to connected clients via Socket.io rooms. |
| Read Receipts | Tracked using `lastReadMessageId` on `ConversationMember`. |
| Presence | ⚠️ **Not yet implemented.** Server `presence.handler.ts` is a skeleton. Sidebar "Online" text is hardcoded. Requires Upstash Redis integration. |

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
- **Presence:** Upstash Redis
- **Hosting:** Render (separate web services for client and server)
- **CI/CD:** GitHub Actions

See [architecture.md](./architecture.md) for the full layer breakdown and decisions.
See [data-flow.md](./data-flow.md) for REST and WebSocket flow details.

---

## 4. Folder Structure

```
nexus/
├── client/               # Next.js 16 frontend
│   └── src/app/          # App Router root (layouts, pages, components)
├── server/               # Express.js + Socket.io backend (WIP)
├── .docs/                # Project documentation (this folder)
│   └── modules/          # Per-module docs (added as modules are built)
├── .agents/              # Agent instruction and context files
├── NEXUS_SLACK_CLONE.md  # Master project specification
└── .gitignore
```

See [structure.txt](./structure.txt) for the full annotated file tree.

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
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |
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
| `messages` | All messages, linked to a conversation and a user. Ordered by `id` ASC (UUIDv7). |

Phase 2 will add: `workspaces`, `workspace_members`, `reactions`.

Key indexes:
- `conversation_members(conversation_id, user_id)`
- `messages(conversation_id, id)`

See the ER diagram in [architecture.md](./architecture.md#3-database-schema).

---

## 7. API List

### REST Endpoints (Phase 1)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | Yes | Returns current Prisma user for a valid Supabase JWT |
| GET | `/api/conversations` | Yes | List all DMs for the current user |
| POST | `/api/conversations` | Yes | Create a new DM conversation |
| GET | `/api/conversations/:id/messages` | Yes | Fetch message history for a conversation |
| POST | `/api/conversations/:id/messages` | Yes | Send a new message |
| PATCH | `/api/conversations/:id/read` | Yes | Update `lastReadMessageId` for the current user |

All authenticated routes expect `Authorization: Bearer <JWT>` header.

### Socket.io Events (Phase 1)

**Client to Server:**

| Event | Payload | Description |
|---|---|---|
| `conversation:join` | `{ conversationId }` | Join a conversation room |
| `conversation:leave` | `{ conversationId }` | Leave a conversation room |
| `message:send` | `{ tempId, conversationId, content }` | Send a message (returns acknowledgment) |
| `message:read` | `{ conversationId }` | Mark conversation as read |

**Server to Client:**

| Event | Payload | Description |
|---|---|---|
| `message:new` | Message object | Broadcast new message to room |
| `message:read` | `{ conversationId, userId, messageId }` | Broadcast read receipt to room |
| `user:online` | `{ userId }` | ⚠️ Defined in contract but not emitted — presence handler is a skeleton |
| `user:offline` | `{ userId, lastSeen }` | ⚠️ Defined in contract but not emitted — presence handler is a skeleton |

---

## 8. Known Limitations

| Limitation | Details |
|---|---|
| Presence system not wired | `presence.handler.ts` is a skeleton — no Redis integration; "Online" in sidebar is hardcoded |
| No file uploads | Phase 1 supports text-only messages |
| No search | No full-text search in Phase 1 |
| No message editing or deletion | Not in Phase 1 scope |
| No notifications | No push or email notifications in Phase 1 |
| Single Socket.io instance | No Redis Pub/Sub adapter; horizontal scaling of the socket server is not supported in Phase 1 |
| DM only | No channels or workspaces until Phase 2 |
