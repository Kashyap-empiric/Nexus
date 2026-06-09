# Nexus — Project Context

> This file is the single-source-of-truth context snapshot for any agent working on this project.
> Read this file at the start of every session before touching code or docs.> **Last Updated:** 2026-06-09

---

## Project Overview

Nexus is a **real-time messaging and collaboration platform** — a Slack-style application built from scratch as a full-stack TypeScript monorepo.
The project is built in phases to ship a working messaging core first, then extend it with team collaboration features:

- **Phase 1** *(nearly complete)*: Authentication, direct messages, real-time delivery via Socket.io, message persistence, read receipts, and basic presence (Redis integration still pending).
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
| **Direct Messages** | Create 1-on-1 DM conversations; each DM has exactly 2 ConversationMembers | ✅ Done |
| **Message Persistence** | Messages saved to PostgreSQL before any real-time broadcast | ✅ Done |
| **Message History** | Paginated fetch of past messages | ✅ Done |
| **Real-time Messaging** | Socket.io rooms (`conversation:{id}`) deliver new messages instantly | ✅ Done |
| **Read Receipts** | `lastReadMessageId` on `ConversationMember` tracks the latest read message; broadcast via Socket.io `message:read` | ✅ Done |
| **Presence System** | Redis tracks online/offline per user; Socket connect/disconnect drives state | ⚠️ Skeletal (no Redis integration yet) |

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
├── server/     → Express.js + Socket.io backend (WIP)
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
| ORM | Prisma | planned | Type-safe DB client |
| Presence Cache | Upstash Redis | planned | Online/offline tracking |
| Hosting | Render | — | Cloud deployment |
| CI/CD | GitHub Actions | — | Lint, test, deploy |

---

## Current Implementation Status

### ✅ Done
- Project scaffolded (monorepo: `/client`, `/server`)
- Next.js 16 client with TypeScript, Tailwind CSS v4
- Root layout with Geist fonts
- Global CSS baseline
- `.docs/` living documentation folder
- `.agents/` agent instructions folder
- Express.js server setup with TypeScript
- Prisma schema definition and migration
- Supabase Auth integration (register, login, session, JWKS local verification)
- Supabase trigger `on_auth_user_created` syncs new auth users into `public.User`
- Next.js Edge middleware for route protection
- Current-user REST endpoint: `GET /api/me`
- Conversation REST endpoints: `GET/POST /api/conversations`, `GET /api/conversations/:id`
- Message REST endpoints: `GET/POST /api/conversations/:conversationId/messages`

### Phase 1 — Completed Items
- [x] REST endpoints: conversations, messages, users
- [x] Socket.io server with auth middleware and auto-join rooms
- [x] Socket.io event handlers: `message:send`, `message:new`, `message:read`
- [x] Socket rate limiting middleware
- [x] Client auth pages (register/login UI)
- [x] Client DM list sidebar with unread indicators
- [x] Client conversation view with paginated message history
- [x] Real-time message delivery via Socket.io rooms
- [x] Optimistic UI for message sending (tempId swapping)
- [x] Read receipt logic with server broadcast (`message:read`)
- [x] Message grouping by sender

### ⚠️ Phase 1 — Remaining Work
- [ ] Upstash Redis presence system (`presence.handler.ts` is a skeleton — no Redis integration)
- [ ] Presence indicators (online/offline badges — "Online" text in sidebar is currently hardcoded)
- [ ] `user:online` / `user:offline` Socket.io events (defined in contract, not emitted)

---

## Architecture Summary

### Request Flow (HTTP)
```
Browser → Next.js (SSR/CSR) → Express REST API → Prisma ORM → Supabase PostgreSQL
```

### Real-Time Flow (WebSocket)
```
Browser ←→ Socket.io Client ←→ Socket.io Server ←→ Upstash Redis (presence)
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

> Full ER diagram is in `.docs/architecture.md`. This section is the quick-reference field list.

### Phase 1 Entities (active)

| Entity | Fields | Indexes |
|---|---|---|
| **User** | `id` (String PK), `email`, `username`, `avatarUrl`, `createdAt`, `updatedAt` | `UNIQUE(email)` |
| **Conversation** | `id` (String PK), `workspaceId` (nullable), `name` (nullable), `type` (DM\|CHANNEL), `isPrivate`, `dmPair`, `createdAt`, `updatedAt` | `UNIQUE(dmPair)` |
| **ConversationMember** | `id` (String PK), `conversationId` (FK), `userId` (FK), `lastReadMessageId` (FK nullable), `joinedAt` | `UNIQUE(conversationId, userId)`, `INDEX(userId, conversationId)` |
| **Message** | `id` (String PK), `content`, `conversationId` (FK), `userId` (FK), `isEdited`, `createdAt`, `updatedAt` | `INDEX(conversationId, id)` |

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
| `conversation:join` | `{ conversationId }` | Subscribe to a conversation room |
| `conversation:leave` | `{ conversationId }` | Unsubscribe from a conversation room |
| `message:send` | `{ conversationId, content }` | Send a new message |
| `message:read` | `{ conversationId, lastReadMessageId }` | Emit read receipt |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `message:new` | `{ message }` | New message broadcast to room |
| `message:read` | `{ userId, conversationId, lastReadMessageId }` | Read receipt broadcast |
| `user:online` | `{ userId }` | User connected |
| `user:offline` | `{ userId, lastSeen }` | User disconnected |

---

## API List

> All REST endpoints require `Authorization: Bearer <JWT>` unless marked **Public**.
> All responses: `{ data: ... }` on success | `{ error: string }` on failure.

### REST — Auth

| Method | Path | Auth | Request Body | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/me` | 🔒 Required | — | `User` | Returns current Prisma user for a valid Supabase JWT |

Registration, login, logout, OAuth, and session refresh are handled by the Supabase client SDK in the Next.js app. Do not add custom sync endpoints; `server/prisma/SUPABASE_QUERIES.sql` owns Auth → Prisma user sync.

### REST — Conversations (`/api/conversations`)

| Method | Path | Auth | Request Body | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/conversations` | 🔒 Required | — | `{ data: Conversation[] }` | List all DM conversations for the authenticated user |
| POST | `/api/conversations` | 🔒 Required | `{ targetUserId }` | `{ data: Conversation }` | Create or return an existing DM |
| GET | `/api/conversations/:id` | 🔒 Required | — | `{ data: Conversation }` | Get details of a single conversation after membership check |
| PATCH | `/api/conversations/:id/read` | 🔒 Required | `{ lastReadMessageId }` | `{ data: ConversationMember }` | Planned read receipt endpoint |

### REST — Messages (`/api/conversations/:conversationId/messages`)

| Method | Path | Auth | Request Body / Query | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/conversations/:conversationId/messages` | 🔒 Required | `?cursor=:messageId&limit=50` | `{ data: Message[], nextCursor }` | Paginated message history |
| POST | `/api/conversations/:conversationId/messages` | 🔒 Required | `{ content }` | `{ data: Message }` | Persist message; no socket broadcast yet |
| PATCH | `/messages/:id` | 🔒 Required | `{ content }` | `{ data: Message }` | Planned edit endpoint |
| DELETE | `/messages/:id` | 🔒 Required | — | `{ data: { success: true } }` | Planned delete endpoint |

### Socket.io Events — Client → Server

| Event | Payload | Side Effect | Description |
|---|---|---|---|
| `conversation:join` | `{ conversationId: string }` | Socket added to room `conversation:{id}` | Subscribe to a conversation's real-time stream |
| `conversation:leave` | `{ conversationId: string }` | Socket removed from room | Unsubscribe from a conversation |
| `message:send` | `{ conversationId: string, content: string }` | Triggers REST persist + `message:new` broadcast | Send a new message |
| `message:read` | `{ conversationId: string, lastReadMessageId: string }` | Triggers planned PATCH `/conversations/:id/read` + `message:read` broadcast | Mark conversation as read |

### Socket.io Events — Server → Client

| Event | Payload | Trigger | Description |
|---|---|---|---|
| `message:new` | `{ message: Message }` | New message saved to DB | Broadcast to all members in `conversation:{id}` room |
| `message:read` | `{ userId, conversationId, lastReadMessageId }` | `message:read` client event processed | Broadcast updated read receipt to room |
| `user:online` | `{ userId: string }` | Socket connect | Broadcast to all connected clients |
| `user:offline` | `{ userId: string, lastSeen: string }` | Socket disconnect + socketCount reaches 0 | Broadcast to all connected clients |

---

## Environment Variables

> These variables must be set before running the app. No defaults are provided for secrets — the app will fail to start if they are missing.

### Client (`client/.env.local`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | `https://xyz.supabase.co` | Supabase project URL — used by Supabase JS SDK on the client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | `eyJ...` | Supabase anon/public key — safe to expose, row-level security enforced on DB |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | `http://localhost:4000` | Base URL of the Express backend (used by TanStack Query fetchers) |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ Yes | `http://localhost:4000` | Socket.io server URL (used by Socket.io client) |

### Server (`server/.env`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | `postgresql://user:pass@host/db` | Prisma connection string — points to Supabase PostgreSQL |
| `DIRECT_URL` | ✅ Yes | `postgresql://user:pass@host/db` | Direct (non-pooled) Prisma URL — used for migrations |
| `SUPABASE_URL` | ✅ Yes | `https://xyz.supabase.co` | Supabase project URL — used by server-side Supabase client for auth verification |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ No | `eyJ...` | Not required for current JWKS-based auth; only add if server-side Supabase Admin operations are introduced |
| `UPSTASH_REDIS_REST_URL` | ✅ Yes | `https://xyz.upstash.io` | Upstash Redis REST endpoint for presence reads/writes |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ Yes | `AX...` | Upstash Redis auth token |
| `PORT` | ❌ Optional | `4000` | Express server port (defaults to 4000) |
| `CLIENT_URL` | ✅ Yes | `http://localhost:3000` | Allowed CORS origin — must match the Next.js dev/prod URL |

---

## Redis Presence Model

```
Key:   user:{userId}
Value: {
  status: "online" | "offline",
  lastSeen: ISO timestamp,
  socketCount: number   ← tracks multi-tab / multi-device
}
```

- On socket `connect` → increment `socketCount`, set `status: online`
- On socket `disconnect` → decrement `socketCount`; if `socketCount === 0` → set `status: offline`, set `lastSeen`

---

## Key Files to Know

| File | What It Does |
|---|---|
| `client/src/app/layout.tsx` | Root HTML shell, font loading, global CSS |
| `client/src/app/page.tsx` | Root page (placeholder) |
| `client/src/app/globals.css` | Tailwind base styles |
| `client/package.json` | Client dependencies and scripts |
| `NEXUS_SLACK_CLONE.md` | Master project spec — authoritative source |
| `.docs/progress.txt` | Day-by-day development log |
| `.docs/structure.txt` | Folder/file tree with annotations |
| `.docs/architecture.md` | System architecture diagrams |
| `.docs/data-flow.md` | Data flow diagrams for all major pathways |
| `.docs/modules/` | Per-module detailed documentation |

---

## Coding Conventions

- TypeScript strict mode everywhere — no `any`, no `as` casts unless absolutely necessary
- Prisma for all DB access on the server — never raw SQL
- TanStack Query for all data fetching on the client — never `useEffect` + `fetch`
- Zustand only for UI state (modals, sidebar open/close, theme) — not server data
- Socket.io events must match the event contract table above exactly — no ad-hoc event names
- REST endpoints return `{ data: ... }` on success and `{ error: string }` on failure
- All protected routes require the `Authorization: Bearer <token>` header
- `lastReadMessageId` is the single source of truth for read receipts — no per-message read table
- Never hard-code secrets — all config via environment variables

---

## Known Limitations

> These are current known gaps, constraints, or technical debt items. Update this list as limitations are resolved or new ones are discovered.

| # | Limitation | Impact | Resolution Plan |
|---|---|---|---|
| 1 | **Presence handler is skeletal** — Socket.io `presence.handler.ts` only logs disconnects; no Redis integration | No real online/offline indicators; "Online" text is hardcoded | Wire Upstash Redis per Day 4 of Phase 1 plan |
| 2 | **DM-only in Phase 1** — No workspaces or channels | Users can only have 1-on-1 conversations | By design; Phase 2 extends this |
| 3 | **No offline queue** — Socket messages dropped if client disconnects mid-send | Potential message loss on flaky connections | Out of scope for Phase 1; consider BullMQ in Phase 3 |
| 4 | **No file/image uploads** | Text-only messaging | Phase 3 — requires S3/Supabase Storage integration |
| 5 | **No push notifications** | Users must have the app open to receive messages | Phase 3 — Web Push API or Resend |
| 6 | **Single Socket.io server instance** — No Redis pub/sub adapter | Cannot horizontally scale the Socket.io server | Phase 3 — add `@socket.io/redis-adapter` backed by Upstash |
| 7 | **No test coverage** — No unit or integration tests written | Regressions won't be caught automatically | Tests should be added alongside each Phase 1 feature |

---

## Module Context Files

Individual module context snapshots (when the codebase grows) are stored in:
```
.agents/module-context/
```

Each file is named `[module-name]-context.md` and contains:
- The current source code of the module
- Its direct dependencies
- Its current test coverage (if any)
- Open TODOs specific to that module
