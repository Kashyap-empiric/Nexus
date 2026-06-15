# Nexus — Project Context (AS-IS System Truth)

> **WARNING**: This file documents the *actual* implemented state of the Nexus system.
> Do not assume missing features exist or that the system perfectly adheres to best practices.
> **Last Updated:** 2026-06-15

---

## 1. Project Overview

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo.
Phase 1 (Core Messaging) is complete. Phase 2 (Workspaces & Channels) is complete and actively deployed. Notifications (in-app + push) are fully implemented.

---

## 2. Implementation Status

### ✅ Implemented Core

- **Monorepo**: Next.js 16 (`/client`), Express.js (`/server`).
- **Auth**: Supabase Auth securely integrated with local ES256 JWKS verification. Supabase database trigger dynamically syncs new auth users to the Prisma `User` table.
- **Database**: PostgreSQL via Prisma with full schema for all models. Backward-compatible migration strategy with idempotent SQL.
- **DM Messaging**: Direct Messages work fully. Messages persist to DB via UUIDv7 IDs.
- **Real-Time**: Socket.io handles message delivery, editing, deletion, read receipts, dynamic room joining, and workspace channel events.
- **Presence**: Dual-write system utilizing Upstash Redis and an in-memory Map fallback.
- **Message Editing/Deletion**: REST endpoints (`PATCH` / `DELETE`) with socket broadcasts.
- **Invite System**: Secure deep-linked invites for USER, CONVERSATION, WORKSPACE types. 24h active rotation policy, atomic consumption via raw SQL, domain event dispatching. Batch invite support (`POST /workspaces/:id/invite-multiple`). Invite by email or username.
- **Workspaces**: Full workspace CRUD with membership and roles (OWNER/ADMIN/MEMBER). Workspace member list (Discord-style right panel). Member removal with notification.
- **Workspace Channels**: Public and private channels within workspaces. Channel creation via the sidebar. All workspace members auto-joined to new public channels. Channel rename, delete, and context menu.
- **In-App Notification System**: Full notification module with bell popover, unread badges, notifications page with infinite scroll pagination, real-time socket delivery (`notification:new`). Types: INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, MEMBER_REMOVED.
- **Web Push Notifications**: VAPID-based push via `web-push` library. Service Worker (`sw.js`) handles push events and `notificationclick` navigation. Push subscription management via API. Push rate limiting.
- **User Profiles & Settings**: `GET/PATCH /users/me` for profile editing (username, displayName, avatarUrl). SharedSettingsModal with Profile, Appearance, and Notifications tabs. Notification preferences stored on User model.
- **InfoPanel**: Conversation detail panel with About, Members, and Pins tabs.
- **Markdown Rendering**: Messages render with `react-markdown` + `remark-gfm` (bold, italic, code, blockquotes, lists, links).
- **Frontend Module Architecture**: Feature modules cleanly split into `notifications/`, `settings/`, `workspaces/`, `invites/`, `conversations/`, `messages/`, `chat/`, `auth/`, `users/`, `landing/`.
- **Socket Module (`client/src/socket/`)**: Fully consolidated socket client module with typed events, store, provider, and handlers.
- **Environment Variables**: All `process.env` references centralized into `config/env.ts` files (both server and client).

### 🔴 Open Issues / Tech Debt

- **Read receipts in channels**: `partnerLastReadMessageId` is undefined for channels — double blue checkmark never shows.
- **Non-transactional reads in `editMessage`**: `getMessageById` called outside `$transaction`.
- **Horizontal scaling trap**: Presence system's in-memory Map prevents scaling beyond single Node.js instance.
- **CreateChannelModal redirects to `/conversations/`**: Should redirect to `/workspaces/{slug}/channels/{id}`.
- **editMessage stale `updatedAt`**: Editing a message doesn't bump the conversation's position in the sidebar.
- **Push subscription lifecycle**: No proactive re-subscription handling on service worker pushsubscriptionchange events.
- **No message read receipts for channels**: Unread counts work but read status synchronization is incomplete.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend Framework | Next.js 16.2.7 | App Router, Edge Middleware (`proxy.ts`) |
| Server State | TanStack Query ^5 | Aggressive client-side caching |
| Backend Framework | Express.js ^4 | REST APIs with mixed HTTP+Socket concerns |
| Real-time | Socket.io ^4 | 15+ events, typed dispatcher, workspace room management |
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
| Workspaces | GET | `/api/workspaces/:id/members` | ✅ |
| Workspaces | GET | `/api/workspaces/:id/channels` | ✅ |
| Workspaces | POST | `/api/workspaces/:id/channels` | ✅ |
| Workspaces | PATCH | `/api/workspaces/:id/channels/:channelId` | ✅ |
| Workspaces | DELETE | `/api/workspaces/:id/channels/:channelId` | ✅ |
| Workspaces | PATCH | `/api/workspaces/:id/members/:userId/role` | ✅ |

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
| C → S | `workspace:join` | ✅ |
| S → C | `channel:update` | ✅ (actions: CREATED, RENAMED, DELETED) |
| S → C | `member:update` | ✅ (actions: ROLE_CHANGED) |
| S → C | `workspace:update` | ✅ (actions: UPDATED) |
| S → C | `notification:new` | 🟡 (client handles, server not yet emitting)

---

## 5. Pre-Existing Technical Debt (Still Open)

These debt items predate the workspace implementation and remain unresolved:

- **Non-transactional reads in `editMessage`**: `getMessageById` is called outside `$transaction`. See `.docs/TECHNICAL_DEBT.md`.
- **Redis Pub/Sub adapter**: Presence system's in-memory Map prevents horizontal scaling beyond a single Node.js instance.
- **Overloaded controllers**: Express controllers manually import and invoke Socket.io dispatchers, breaking separation of concerns.

## 7. Backward Compatibility

When deploying the workspace migration to production:
- **Migration is purely additive**: Only `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX` / `ADD CONSTRAINT` — no destructive operations.
- **ConversationMember PK**: Uses `@id` (simple PK) + `@@unique([conversationId, userId])`, matching the production schema. Composite `@@id` was avoided to prevent a destructive migration.
- **Idempotent SQL**: Migration uses `IF NOT EXISTS` and PL/pgSQL `DO $$ ... EXCEPTION` blocks so it can be safely run against existing databases.
- **Safe to deploy while main runs**: Main's Prisma client ignores unknown columns/tables.
- **Migration applied successfully** to the dev database via `prisma migrate deploy`.

## 8. Branch Context

The current active branch is `feat/workspaces`. This branch contains the complete workspace module implementation:
- Workspace CRUD (server + client)
- Channel creation, rename, delete with public/private visibility
- Workspace member list (Discord-style right panel with presence)
- Channel context menu (rename, delete, invite)
- Promote/demote members to ADMIN
- Socket events: `channel:update`, `member:update`, `workspace:update`
- Workspace room joining on socket connect
- Backward-compatible database migration
- Centralized environment variables in `config/env.ts`
- Security fixes: private channel socket room filtering

To merge: `git checkout development && git merge feat/workspaces`
