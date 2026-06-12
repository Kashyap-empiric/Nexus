# Nexus — Project Context (AS-IS System Truth)

> **WARNING**: This file documents the *actual* implemented state of the Nexus system.
> Do not assume missing features exist or that the system perfectly adheres to best practices.
> **Last Updated:** 2026-06-12

---

## 1. Project Overview

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo.
Phase 1 (Core Messaging) is complete. Phase 2 (Workspaces & Channels) is under active development on the `feat/workspaces` branch.

---

## 2. Implementation Status

### ✅ Implemented Core

- **Monorepo**: Next.js 16 (`/client`), Express.js (`/server`).
- **Auth**: Supabase Auth securely integrated with local ES256 JWKS verification. Supabase database trigger dynamically syncs new auth users to the Prisma `User` table.
- **Database**: PostgreSQL via Prisma with full schema for all models.
- **DM Messaging**: Direct Messages work fully. Messages persist to DB via UUIDv7 IDs.
- **Real-Time**: Socket.io handles message delivery, editing, deletion, read receipts, and dynamic room joining.
- **Presence**: Dual-write system utilizing Upstash Redis and an in-memory Map fallback.
- **Message Editing/Deletion**: REST endpoints (`PATCH` / `DELETE`) with socket broadcasts.
- **Invite System**: Secure deep-linked invites for USER, CONVERSATION, WORKSPACE types. 24h active rotation policy, atomic consumption via raw SQL, domain event dispatching.
- **Workspaces**: Full workspace CRUD with membership and roles (OWNER/ADMIN/MEMBER).
- **Workspace Channels**: Public channels within workspaces. Channel creation via the sidebar. All workspace members auto-joined to new public channels.
- **Frontend Module Architecture**: Feature modules cleanly split into `workspaces/`, `invites/`, `conversations/`, `messages/`, `chat/`, `auth/`, `users/`.
- **Socket Module (`client/src/socket/`)**: Fully consolidated socket client module with typed events, store, provider, and handlers.

### 🔴 Open Issues / Tech Debt

- **Read receipts in channels**: `partnerLastReadMessageId` is undefined for channels — double blue checkmark never shows.
- **No member list UI**: Workspace members are fetched but not displayed in a dedicated member list view.
- **No in-app notification system**: Only desktop browser notifications exist; no bell icon, inbox, or notification history.
- **Channels not split by public/private**: Sidebar shows flat channel list; `isPrivate` field exists but unused in UI.
- **Non-transactional reads in `editMessage`**: `getMessageById` called outside `$transaction`.
- **Horizontal scaling trap**: Presence system's in-memory Map prevents scaling beyond single Node.js instance.
- **CreateChannelModal redirects to `/conversations/`**: Should redirect to `/workspaces/{slug}/channels/{id}`.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend Framework | Next.js 16.2.7 | App Router, Edge Middleware (`proxy.ts`) |
| Server State | TanStack Query ^5 | Aggressive client-side caching |
| Backend Framework | Express.js ^4 | REST APIs with mixed HTTP+Socket concerns |
| Real-time | Socket.io ^4 | 11+ events, typed dispatcher |
| Database / ORM | Supabase PostgreSQL / Prisma 7.x | Full schema with workspaces |
| Presence Cache | Upstash Redis | Dual-writes to in-memory Map |
| Package Manager | pnpm (root), npm (client/server) | |

---

## 4. API & Socket Contract

### REST Endpoints

| Module | Method | Route | Status |
|--------|--------|-------|--------|
| Auth | GET | `/api/me` | ✅ |
| Conversations | GET | `/api/conversations` | ✅ |
| Conversations | POST | `/api/conversations` | ✅ |
| Conversations | GET | `/api/conversations/:id` | ✅ |
| Conversations | PATCH | `/api/conversations/:id/read` | ✅ |
| Messages | GET | `/api/conversations/:id/messages` | ✅ |
| Messages | POST | `/api/conversations/:id/messages` | ✅ |
| Messages | PATCH | `/api/conversations/:id/messages/:messageId` | ✅ |
| Messages | DELETE | `/api/conversations/:id/messages/:messageId` | ✅ |
| Users | GET | `/api/users` | ✅ |
| Users | GET | `/api/users/search?q=` | ✅ |
| Invites | POST | `/api/invites/generate` | ✅ |
| Invites | POST | `/api/invites/resolve` | ✅ |
| Workspaces | GET | `/api/workspaces` | ✅ |
| Workspaces | POST | `/api/workspaces` | ✅ |
| Workspaces | GET | `/api/workspaces/:id` | ✅ |
| Workspaces | GET | `/api/workspaces/:id/channels` | ✅ |
| Workspaces | POST | `/api/workspaces/:id/channels` | ✅ |

### Socket.io Events

| Direction | Event | Status |
|-----------|-------|--------|
| C → S | `message:send` | ✅ |
| S → C | `message:new` | ✅ |
| S → C | `message:update` | ✅ |
| S → C | `message:delete` | ✅ |
| S → C | `message:read` | ✅ |
| S → C | `user:online` | ✅ |
| S → C | `user:offline` | ✅ |
| S → C | `presence:initial` | ✅ |
| S → C | `conversation:new` | ✅ |
| S → C | `conversation:update` | ✅ |

---

## 5. Pre-Existing Technical Debt (Still Open)

These debt items predate the workspace implementation and remain unresolved:

- **Non-transactional reads in `editMessage`**: `getMessageById` is called outside `$transaction`. See `.docs/TECHNICAL_DEBT.md`.
- **Redis Pub/Sub adapter**: Presence system's in-memory Map prevents horizontal scaling beyond a single Node.js instance.
- **Overloaded controllers**: Express controllers manually import and invoke Socket.io dispatchers, breaking separation of concerns.

## 6. Next Steps

See `PLAN.md` at the project root for the prioritized list of remaining feature work:

1. Fix message read receipts for channels
2. Add workspace member list (Discord-style online/offline)
3. Add in-app notification system (bell icon + inbox)
4. Split channels into public/private sections in sidebar

---

## 6. Branch Context

The current active branch is `feat/workspaces`. This branch contains the workspace module implementation including:
- Workspace CRUD (server + client)
- Channel creation and display
- Workspace member management
- Workspace routing (`/workspaces/{slug}/channels/{channelId}`)
- Navigation rail workspace switching
