# Nexus — Project Context (AS-IS System Truth)

> **WARNING**: This file documents the *actual* implemented state of the Nexus system as of the Phase 1 Audit (June 11th, 2026). Do not assume missing features exist or that the system perfectly adheres to best practices.
> **Last Updated:** 2026-06-11

---

## 1. Project Overview

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo.
Phase 1 (Core Messaging) has concluded. Several deep architectural deviations and technical debt items were introduced during development.

---

## 2. Actual Implementation Status

### ✅ Implemented Core
- **Monorepo**: Next.js 16 (`/client`), Express.js (`/server`).
- **Auth**: Supabase Auth securely integrated with local ES256 JWKS verification. Supabase database trigger dynamically syncs new auth users to the Prisma `User` table.
- **Database**: PostgreSQL via Prisma.
- **Messaging**: Direct Messages work. Messages persist to DB via UUIDv7 IDs.
- **Real-Time**: Socket.io handles message delivery, editing, deletion, read receipts (`message:read`), and dynamic room joining.
- **Presence**: Dual-write system utilizing Upstash Redis and an in-memory Map fallback.
- **Message Editing/Deletion**: ✅ REST endpoints exposed (`PATCH` / `DELETE`) with socket broadcasts (`message:update`, `message:delete`, `conversation:update`).
- **Invite System**: Secure deep-linked invites for USER and CONVERSATION types. 24h active rotation policy, atomic consumption via raw SQL, domain event dispatching.

### 🔴 Architectural Deviations & Tech Debt (The Brutal Reality)
- **Message Editing/Deletion is Exposed but Flawed**: The REST endpoints **ARE** registered and exposed. However, their Prisma implementations suffer from non-transactional reads that create severe race conditions.
- **Soft-Delete Data Leakage**: The `getMessages` backend query fails to filter `deletedAt: null`. It leaks soft-deleted payloads to the client.
- **Overloaded Controllers**: The Express controllers manually import and invoke Socket.io dispatchers, breaking separation of concerns.
- **Pagination Bug**: Message pagination relies on `orderBy: { createdAt: "desc" }`, failing to utilize the monotonic guarantees of UUIDv7.
- **Horizontal Scaling Trap**: The presence system's in-memory Map fallback prevents the backend from scaling beyond a single Node.js instance.

---

## 3. Tech Stack

| Layer | Technology | Actual Implementation Notes |
|---|---|---|
| Frontend Framework | Next.js 16.2.7 | App Router. Uses Edge Middleware (`proxy.ts`) for route protection. |
| Server State | TanStack Query ^5 | Manually caches optimistic payloads via `tempId`. Highly aggressive client-side caching. |
| Backend Framework | Express.js ^4 | Serves REST APIs. Controllers improperly mix HTTP logic with WebSocket emissions. |
| Real-time | Socket.io ^4 | Emits `message:*`, `conversation:*`, `user:*`, `presence:*` events. Typed dispatcher in `socket.dispatcher.ts`. |
| Database / ORM | Supabase PostgreSQL / Prisma 7.x | Schema supports soft deletes (`deletedAt`), but queries do not enforce it. |
| Presence Cache | Upstash Redis | Dual-writes to an in-memory Map, introducing state fragmentation if scaled. |

---

## 4. API & Socket Contract (Reality)

### Socket.io Events
- **Client → Server**: `message:send`
- **Server → Client**: `message:new`, `message:update`, `message:delete`, `message:read`, `user:online`, `user:offline`, `presence:initial`, `conversation:new`, `conversation:update`
- **Not implemented**: `typing:start`, `typing:stop`
- **Key Architecture**: The server strictly emits `conversation:update` to control metadata like `latestMessage`. The client does not derive this from message payloads.

### REST Endpoints
- **Auth**: `GET /api/me`
- **Conversations**: `GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations`, `PATCH /api/conversations/:id/read`
- **Messages**: `GET /api/conversations/:id/messages`, `POST /api/conversations/:id/messages`, `PATCH /api/conversations/:id/messages/:messageId`, `DELETE /api/conversations/:id/messages/:messageId`
- **Users**: `GET /api/users`, `GET /api/users/search?q=`
- **Invites**: `POST /api/invites/generate`, `POST /api/invites/resolve`

---

## 5. Next Steps / Debt Resolution

Before adding Workspaces or Channels (Phase 2), future work MUST resolve:
- `getMessages` soft-delete leakage
- Non-transactional read race conditions in `messages.service.ts`
- Switch pagination from `createdAt` to `id` ordering
- Add Redis Pub/Sub adapter for horizontal scaling

Consult `.docs/TECHNICAL_DEBT.md` for full details and `.docs/socket.md` for complete socket documentation.
