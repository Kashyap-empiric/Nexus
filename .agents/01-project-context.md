# Nexus — Project Context

> This file is the single-source-of-truth context snapshot for any agent working on this project.
> Read this file at the start of every session before touching code or docs.
> **Last Updated:** 2026-06-09

---

## Project Overview

Nexus is a **real-time messaging and collaboration platform** — a Slack-style application built from scratch as a full-stack TypeScript monorepo.
The project is built in phases to ship a working messaging core first, then extend it with team collaboration features:

- **Phase 1** *(core features complete)*: Authentication, direct messages, real-time delivery via Socket.io, message persistence, read receipts, and Redis-backed presence. 🟡 Message editing service and soft-delete schema exist but REST endpoints not yet exposed.
- **Phase 2**: Workspaces, public/private channels, emoji reactions, rich text formatting.
- **Phase 3+**: File uploads, full-text search, WebRTC voice/video, AI features, microservices migration.

---

## Features

### Phase 1 — Core Foundation (current status)

| Feature | Description | Status |
|---|---|---|
| **User Registration** | Email/password sign-up via Supabase Auth; Supabase DB trigger syncs user record to Prisma DB | ✅ Done |
| **User Login** | Email/password login; Supabase issues JWT; client stores session via SDK | ✅ Done |
| **Session Management** | Supabase SDK handles token refresh, persistence, and expiry automatically | ✅ Done |
| **Protected Routes** | Next.js Edge middleware + Express auth middleware block unauthenticated access | ✅ Done |
| **Direct Messages** | Create 1-on-1 DM conversations; `dmPair` unique constraint prevents duplicates | ✅ Done |
| **Message Persistence** | Messages saved to PostgreSQL before any real-time broadcast. Uses Prisma `$transaction` to also update conversation `updatedAt` | ✅ Done |
| **Message History** | Paginated fetch of past messages via cursor-based pagination | ✅ Done |
| **Real-time Messaging** | Socket.io rooms (`conversation:{id}`) deliver new messages instantly. Dual path: socket + REST fallback | ✅ Done |
| **Read Receipts** | `lastReadMessageId` on `ConversationMember` tracks the latest read message; broadcast via Socket.io `message:read` | ✅ Done |
| **Presence System** | Redis-backed with in-memory fallback. Multi-tab handling via socket ID Sets. All events wired: `user:online`, `user:offline`, `presence:initial`. `PresenceIndicator` component renders green/gray dot | ✅ Done |
| **New Conversation Notification** | Server dynamically joins sockets to new rooms + emits `conversation:new` to `user:<userId>` rooms | ✅ Done |
| **Rate Limiting** | Socket middleware (10 msg/10s) + REST `generalLimiter` + `messageLimiter` | ✅ Done |
| **Message Editing** | `editMessage` service with validation (owns message, not deleted, not empty) | 🟡 Service exists, no REST endpoint |
| **Message Soft-Delete** | `deletedAt` field on Message schema + migration applied | 🟡 Schema done, no API endpoint |

### Phase 2 — Collaboration Extensions (future)

| Feature | Description |
|---|---|
| **Workspaces** | Isolated team environments containing members and conversations |
| **Workspace Roles** | RBAC: Owner, Admin, Member — controls permissions per workspace |
| **Public Channels** | Open group conversations inside a workspace; type=CHANNEL in Conversation |
| **Private Channels** | Invite-only group conversations; `is_private=true` |
| **Emoji Reactions** | Users attach emoji to messages; reaction events broadcast via Socket.io |
| **Rich Text** | Bold, italic, code blocks, lists in message content |

---

## Monorepo Structure

```
nexus/
├── client/     → Next.js 16 frontend
├── server/     → Express.js + Socket.io backend
├── .docs/      → Living documentation (progress, structure, architecture, modules)
└── .agents/    → Agent instruction and context files (this folder)
```

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend Framework | Next.js | 16.2.7 | App Router, SSR/CSR |
| UI Language | React | 19.2.4 | Server + Client Components |
| Type System | TypeScript | ^5 | Both client and server |
| Styling | Tailwind CSS | ^4 | Utility-first, PostCSS |
| Server State | TanStack Query | ^5 | Fetch, cache, sync — fully integrated |
| UI State | Zustand | ^5 | Lightweight global state — active in chatStore |
| Backend Framework | Express.js | ^4 | REST API |
| Real-time | Socket.io | ^4 | WebSocket events — fully implemented |
| Database | Supabase PostgreSQL | — | Primary relational store |
| Auth | Supabase Auth | — | JWT-based sessions |
| ORM | Prisma | 7.x | Type-safe DB client |
| Presence Cache | Upstash Redis | — | Online/offline tracking — fully integrated |
| Hosting | Render | — | Cloud deployment |
| CI/CD | GitHub Actions | — | Lint, test, deploy |

---

## Current Implementation Status

### ✅ Done — All Core Phase 1
- Project scaffolded (monorepo: `/client`, `/server`)
- Next.js 16 client with TypeScript, Tailwind CSS v4
- Root layout with Geist fonts, global CSS baseline
- `.docs/` living documentation folder, `.agents/` agent instructions folder
- Express.js server setup with TypeScript
- Prisma schema definition and migration (including `deletedAt` for soft-delete)
- Supabase Auth integration (register, login, session, JWKS local verification)
- Supabase trigger `on_auth_user_created` syncs new auth users into `public.User`
- Next.js Edge middleware for route protection
- Current-user REST endpoint: `GET /api/me`, Users list: `GET /api/users`
- Conversation REST endpoints: `GET/POST /api/conversations`, `GET /api/conversations/:id`
- Message REST endpoints: `GET/POST /api/conversations/:conversationId/messages`
- Read receipt endpoint: `PATCH /api/conversations/:id/read` with socket broadcast
- Socket.io server with auth middleware, auto-join rooms, rate limiting
- Socket.io event handlers: `message:send`, `message:new`, `message:read`
- Socket.io presence: `user:online`, `user:offline`, `presence:initial`
- Redis-backed `presenceStore.ts` with in-memory fallback, dual-write
- Client auth pages (register/login UI)
- Client DM list sidebar with unread indicators
- Client conversation view with paginated message history
- Real-time message delivery via Socket.io rooms
- Optimistic UI for message sending (tempId swapping)
- Read receipt logic with server broadcast (`message:read`)
- Message grouping by sender
- Presence indicators (`PresenceIndicator` component, `usePresence` hook)
- `MessageStatus` component (pending/sent/read states)
- Dynamic room joining for new conversations + `conversation:new` notification
- Message editing service (`editMessage`) with validation

### 🟡 Phase 1 — Infrastructure Exists, No REST Endpoint
- [ ] Message edit REST endpoint (service exists in `messages.service.ts`)
- [ ] Message soft-delete REST endpoint (schema `deletedAt` + migration done)
- [ ] Filter soft-deleted messages in `getMessages` (needs `where: { deletedAt: null }`)
- [ ] Switch cursor pagination from `createdAt` → `id` ordering

---

## Architecture Summary

### Request Flow (HTTP)
```
Browser → Next.js (SSR/CSR) → Express REST API → Prisma ORM → Supabase PostgreSQL
```

### Real-Time Flow (WebSocket)
```
Browser ←→ Socket.io Client ←→ Socket.io Server ←→ Redis (presence store)
                                                   ↓
                                        Broadcasts to room members
```

### Auth Flow
```
Browser → Supabase Auth SDK → Supabase Auth Service → JWT
Supabase Database Trigger: `on_auth_user_created` automatically syncs new users to `public.User` table.
JWT → Express Auth Middleware → Verify locally using ES256 JWKS → Route Handler (zero DB calls in middleware)
```

---

## Database Schema

### Phase 1 Entities (active)

| Entity | Fields | Indexes |
|---|---|---|
| **User** | `id` (String PK), `email` (unique), `username`, `avatarUrl?`, `createdAt`, `updatedAt` | `UNIQUE(email)` |
| **Conversation** | `id` (String PK), `workspaceId?`, `name?`, `type` (DM\|CHANNEL), `isPrivate`, `dmPair?`, `createdAt`, `updatedAt` | `UNIQUE(dmPair)` |
| **ConversationMember** | `id` (String PK), `conversationId` (FK), `userId` (FK), `lastReadMessageId?` (FK), `joinedAt` | `UNIQUE(conversationId, userId)`, `INDEX(userId, conversationId)` |
| **Message** | `id` (String PK), `content`, `conversationId` (FK), `userId` (FK), `isEdited`, `deletedAt?`, `createdAt`, `updatedAt` | `INDEX(conversationId, id)` |

### Phase 2 Entities (planned)

| Entity | Fields |
|---|---|
| **Workspace** | `id`, `name`, `slug`, `created_at` |
| **WorkspaceMember** | `id`, `workspace_id` (FK), `user_id` (FK), `role` (OWNER\|ADMIN\|MEMBER) |
| **Reaction** | `id`, `emoji`, `message_id` (FK), `user_id` (FK) — unique constraint on `(message_id, user_id, emoji)` |

---

## Socket.io Event Contract (Phase 1)

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `message:send` | `{ conversationId, content, tempId }` | Send a new message (expects callback ack) |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `message:new` | `Message` object | New message broadcast to room |
| `message:read` | `{ userId, conversationId, lastReadMessageId }` | Read receipt broadcast |
| `user:online` | `{ userId }` | User connected (first socket) |
| `user:offline` | `{ userId }` | User disconnected (last socket) |
| `presence:initial` | `{ userIds: string[] }` | Snapshot of online users (sent on connect) |
| `conversation:new` | `Conversation` object | New conversation notification (sent to `user:<userId>` room) |

---

## API List

> All REST endpoints require `Authorization: Bearer <JWT>` unless marked **Public**.
> All responses: `{ data: ... }` on success | `{ error: string }` on failure.

### REST — Auth

| Method | Path | Auth | Request Body | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/me` | 🔒 Required | — | `User` | Returns current Prisma user for a valid Supabase JWT |
| GET | `/api/users` | 🔒 Required | — | `User[]` | Returns list of registered users for search/suggestions |

Registration, login, logout, OAuth, and session refresh are handled by the Supabase client SDK in the Next.js app.

### REST — Conversations (`/api/conversations`)

| Method | Path | Auth | Request Body | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/conversations` | 🔒 Required | — | `{ data: Conversation[] }` | List all DM conversations for the authenticated user |
| POST | `/api/conversations` | 🔒 Required | `{ targetUserId }` | `{ data: Conversation }` | Create or return an existing DM. Dynamically joins sockets + emits `conversation:new` |
| GET | `/api/conversations/:id` | 🔒 Required | — | `{ data: Conversation }` | Get details of a single conversation with membership check |
| PATCH | `/api/conversations/:id/read` | 🔒 Required | `{ messageId }` | `{ success: true }` | Update `lastReadMessageId`. Validates message exists + belongs to conversation. Broadcasts `message:read` |

### REST — Messages (`/api/conversations/:conversationId/messages`)

| Method | Path | Auth | Request Body / Query | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/conversations/:conversationId/messages` | 🔒 Required | `?cursor=:messageId&limit=50` | `{ data: Message[], nextCursor }` | Paginated message history (cursor-based) |
| POST | `/api/conversations/:conversationId/messages` | 🔒 Required | `{ content }` | `{ data: Message }` | Persist message; broadcasts `message:new` to socket room |

---

## Environment Variables

### Client (`client/.env.local`)
| Variable | Required | Example | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | `https://xyz.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | `eyJ...` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | `http://localhost:4000` | Base URL of the Express backend |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ Yes | `http://localhost:4000` | Socket.io server URL |

### Server (`server/.env`)
| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | `postgresql://user:pass@host:6543/db` | Prisma connection string (pooled) |
| `DIRECT_URL` | ✅ Yes | `postgresql://user:pass@host:5432/db` | Direct (non-pooled) Prisma URL for migrations |
| `SUPABASE_URL` | ✅ Yes | `https://xyz.supabase.co` | Supabase project URL for JWKS verification |
| `REDIS_URL` | ✅ Yes | `redis://default:pass@localhost:6379` | Redis connection URL (used by `redis` npm package) |
| `PORT` | ❌ Optional | `4000` | Express server port (defaults to 4000) |
| `CLIENT_URL` | ✅ Yes | `http://localhost:3000` | Allowed CORS origin(s), comma-separated |

---

## Redis Presence Model

```
Key:   user:presence:{userId}   (Redis Set)
Value: { socketId1, socketId2, ... }

Key:   presence:users           (Redis Set)
Value: { userId1, userId2, ... }

Key:   user:lastSeen:{userId}   (String)
Value: ISO timestamp (set on last socket disconnect)
```

**Lifecycle:**
- On connect → `SADD user:presence:{userId} {socketId}`, `SADD presence:users {userId}`. Broadcast `user:online` if Set was previously empty.
- On disconnect → `SREM user:presence:{userId} {socketId}`. If Set now empty → `DEL user:presence:{userId}`, `SREM presence:users {userId}`, `SET user:lastSeen:{userId}`. Broadcast `user:offline`.
- **In-memory fallback:** All operations also write to an in-memory `Map<userId, Set<socketId>>` for resilience when Redis is unavailable.

---

## Known Issues & Technical Debt

| # | Issue | Impact | Priority |
|---|---|---|---|
| 1 | Cursor pagination orders by `createdAt` instead of `id` | UUIDv7 monotonic ordering not fully leveraged | Medium |
| 2 | Soft-deleted messages not filtered in `getMessages` | Deleted messages still appear in history | Low (no delete endpoint yet) |
| 3 | REST rate limiters read `process.env` directly | Should use `ENV` config object | Low |
| 4 | No `reset-password` page UI | Forgot password sends email, user has no UI to enter new password | Low |
| 5 | No explicit `signOut()` before 401 redirect | Session cookie may not be fully cleared | Low |
| 6 | Single Socket.io server instance (no Redis pub/sub adapter) | Cannot horizontally scale Socket.io | Phase 3 |
