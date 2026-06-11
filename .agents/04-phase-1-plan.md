# Nexus — Phase 1 Plan (HISTORICAL ARCHIVE)

> **CRITICAL WARNING**: This file is an archived historical document representing the *intended* Phase 1 plan (5-Day Sprint). The sprint has concluded.
> The system has massively deviated from this plan. Do **NOT** use this file as the source of truth for the codebase.
> **Instead, you must read `.docs/AS_IS_ARCHITECTURE.md`, `.docs/TECHNICAL_DEBT.md`, and `.docs/socket.md`.**
>
> **Last Updated:** 2026-06-11 (Archived)

---

## Project Structure

```
nexus/
  client/
    src/
      app/
      modules/ (auth, chat, landing, users)
      shared/ (providers, components, lib)
      proxy.ts
  server/
    src/
      modules/ (conversations, messages, users, invites)
      middlewares/
      socket/ (handlers, dispatcher, presenceStore)
      lib/
      types/
    prisma/
```

---

## Day 1 — Foundation, Schema & Server Auth

**Status: ✅ Complete**

### Server

Schema models implemented:

| Model | Fields |
|---|---|
| `User` | `id` (String, PK) · `email` (unique) · `username` · `avatarUrl` · `createdAt` · `updatedAt` |
| `Conversation` | `id` (String, PK) · `type` (enum: DM, CHANNEL) · `isPrivate` · `name` (nullable) · `workspaceId` (nullable) · `dmPair` (String?, unique) · `latestMessageId` (String?) · `createdAt` · `updatedAt` |
| `ConversationMember` | `id` (String, PK) · `conversationId` (FK) · `userId` (FK) · `lastReadMessageId` (String?, FK → Message.id) · `joinedAt` |
| `Message` | `id` (String, PK) · `content` · `conversationId` (FK) · `userId` (FK) · `isEdited` (Boolean) · `deletedAt` (DateTime?) · `createdAt` · `updatedAt` |
| `Invite` | `id` (String, PK) · `type` (enum) · `entityId` · `token` (unique) · `maxUses` · `usedCount` · `expiresAt` · `revoked` · `createdBy` · `lastUsedAt` |

Key files:
- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/src/lib/db.ts` — Prisma client
- `server/src/types/shared.ts` — AuthRequest extends Express Request
- `server/src/middlewares/auth.ts` — JWT validation via Supabase JWKS
- `server/src/middlewares/errorHandler.ts` — global error handler
- `server/src/middlewares/rateLimiter.ts` — `generalLimiter` + `messageLimiter`
- `server/prisma/SUPABASE_QUERIES.sql` — Supabase trigger syncs auth.users → public.User
- `GET /api/me` — current user endpoint
- `server/src/app.ts` — Express app config (CORS, body parser, auth, routes, error handler)
- `server/src/server.ts` — http.createServer, socket.io attach, Redis connect, listen

### End of Day 1 Checks — ✅ All Complete

- [x] `npx prisma migrate dev` runs clean, all tables visible in Supabase
- [x] `npx prisma db seed` runs without errors
- [x] Seed script upserts 1 DM conversation + 3 messages with UUIDv7 IDs
- [x] Supabase trigger creates matching `public.User` rows for new auth users
- [x] `GET /api/me` with valid JWT returns 200 + user object
- [x] `GET /api/me` with no token returns 401
- [x] Rate limiting added: `generalLimiter` and `messageLimiter`

---

## Day 2 — Client Auth + Conversation & Message API

**Status: ✅ Complete**

### Morning — Client Auth

- `client/src/lib/supabase.ts` — Supabase browser client (`createBrowserClient`)
- `client/src/proxy.ts` — Next.js Edge Middleware for route protection
- `client/src/modules/auth/hooks/useAuth.ts` — login, register, OAuth, logout
- `client/src/modules/auth/schemas/auth.ts` — Zod schemas, password complexity
- `client/src/modules/auth/components/LoginForm.tsx`, `RegisterForm.tsx`
- `client/src/app/(auth)/*` — auth pages
- `client/src/app/auth/callback/page.tsx` — OAuth callback
- `client/src/shared/lib/api.ts` — Axios instance with 401 interceptor
- `client/src/providers/query-provider.tsx` — TanStack Query config (no retry on 4xx)

### Afternoon — Conversation & Message API

**Server endpoints:**

- `GET /api/conversations` — sidebar list
- `POST /api/conversations` — create DM with dmPair upsert
- `GET /api/conversations/:id` — single conversation + members
- `GET /api/conversations/:id/messages` — cursor-based pagination
- `POST /api/conversations/:id/messages` — persist message (UUIDv7) + broadcast `message:new`
- `PATCH /api/conversations/:id/read` — update `lastReadMessageId` + broadcast `message:read`
- `GET /api/users` — list all registered users

**Client:**

- `queryKeys.ts` — centralized query key factories
- `useConversations.ts`, `useMessages.ts`, `useSendMessage`, `useMarkRead`
- Conversation sidebar, MessageList, MessageInput, etc.
- NewConversationModal with user search
- Read receipt trigger via `useEffect` + `useRef` guard

### End of Day 2 Checks — ✅ All Complete

- [x] Register via client UI, user appears in Supabase Auth + Postgres
- [x] Login via client UI, session persists on refresh
- [x] Protected layout redirects unauthenticated users to /login
- [x] Create a DM, duplicate DM returns existing one
- [x] Send a message, see it in DB with UUIDv7 id
- [x] Fetch message history — cursor pagination works
- [x] Sidebar renders conversation list
- [x] Message view renders history

---

## Day 3 — Real-time (Socket.io)

**Status: ✅ Complete**

### Server

- `server/src/socket/socket.ts` — io setup, auth middleware, auto-join rooms
- `server/src/socket/middlewares/auth.ts` — JWT validation on handshake
- `server/src/socket/middlewares/rateLimiter.ts` — per-socket rate limiter (10 msg/10s)
- `server/src/socket/handlers/message.handler.ts` — `message:send` → persist + broadcast
- `server/src/socket/handlers/presence.handler.ts` — connect/disconnect presence
- `server/src/socket/presenceStore.ts` — Redis-backed store with in-memory fallback
- `server/src/socket/socket.dispatcher.ts` — typed dispatch helpers
- `server/src/shared/socket-events.ts` — event name constants + payload types

**Updates to existing controllers:**
- `conversations.controller.ts`: POST create DM → dynamically join sockets + emit `conversation:new`
- `conversations.controller.ts`: PATCH read → emit `message:read` to room
- `messages.controller.ts`: POST message → emit `message:new` to room

### Client

- `client/src/shared/lib/socket.ts` — singleton socket.io-client with auth callback
- `client/src/shared/providers/socket-provider.tsx` — connection lifecycle management + presence listeners
- `client/src/modules/chat/hooks/useConversationSocket.ts` — inject `message:new`, `message:update`, `message:delete`, `message:read` into cache
- `client/src/modules/chat/hooks/useGlobalSocket.ts` — global listeners for sidebar updates (new conversations, unread counts)
- `client/src/modules/chat/hooks/useMessages.ts` — optimistic update lifecycle with `tempId`
- `client/src/modules/chat/store/chatStore.ts` — `socketStatus`, `onlineUsers`, `activeConversationId`, `drafts`
- `client/src/modules/chat/realtime/` — event router factory pattern
- `client/src/modules/chat/utils/cacheHelpers.ts` — cache update helpers
- `client/src/modules/chat/components/PresenceIndicator.tsx` — green/gray dot
- `client/src/modules/chat/components/MessageStatus.tsx` — pending/sent/read states

### End of Day 3 Checks — ✅ All Complete

- [x] Socket.io server with auth middleware and auto-join rooms
- [x] Socket.io rate limiting middleware
- [x] `message:send` handler persists to DB and broadcasts `message:new` to room
- [x] Client socket provider manages connection lifecycle
- [x] `useConversationSocket` injects `message:new` into TanStack Query cache
- [x] `useGlobalSocket` handles cross-conversation updates, read receipts, new conversations
- [x] Optimistic UI with tempId, pending state, and server-ack swap
- [x] Read receipts broadcast `message:read` on server after DB update
- [x] Presence fully wired: Redis + in-memory fallback, multi-tab support
- [x] `user:online` / `user:offline` / `presence:initial` all emitted
- [x] `PresenceIndicator` and `MessageStatus` components rendered in UI
- [x] Dynamic room joining for new conversations + `conversation:new` notification

---

## Day 4 — Presence & Read Receipts UI

**Status: ✅ Complete (merged with Day 3 work)**

- [x] Sent message shows pending state immediately (optimistic UI)
- [x] Other user opens conversation, read receipt updates in sender's view
- [x] Failed message shows styled error toast (red bg + AlertTriangle for rate limit)
- [x] User comes online, other user sees the green dot appear without refresh
- [x] User closes tab, other user sees them go offline
- [x] Multi-tab support: offline only fires when all tabs close
- [x] Presence handler fully wired with Redis + in-memory fallback
- [x] Presence indicators driven by real presence data (not hardcoded)

---

## Day 5 — Integration, Polish & Demo Prep

**Status: ✅ Complete (with deferred debt)**

### What Got Done

- [x] Message edit REST endpoint (`PATCH /conversations/:id/messages/:messageId`)
- [x] Message soft-delete REST endpoint (`DELETE /conversations/:id/messages/:messageId`)
- [x] Socket broadcasts for edit/delete (`message:update`, `message:delete`, `conversation:update`)
- [x] Sidebar search filter
- [x] UI refinements (Message button, responsive layout)

### Deferred Debt (Still Open)

- [ ] Filter soft-deleted messages in `getMessages` (`where: { deletedAt: null }`)
- [ ] Switch pagination from `createdAt` to `id` ordering
- [ ] Fix race condition in `deleteMessage` (non-transactional read)
- [ ] Fix non-transactional reads in `editMessage`
- [ ] Add Redis Pub/Sub adapter for Socket.io horizontal scaling

---

## Phase 1 Scope Boundary

| Feature | In Scope | Status |
|---|---|---|
| Email/password auth | ✅ | Complete |
| OAuth (Google, GitHub) | ❌ Phase 2 | — |
| Direct Messages | ✅ | Complete |
| Real-time delivery | ✅ | Complete |
| Message history (paginated, cursor-based) | ✅ | Complete |
| Read receipts | ✅ | Complete |
| Presence (online/offline) | ✅ | Complete |
| Message editing | ✅ | Complete (with debt) |
| Message deletion | ✅ | Complete (with debt) |
| Invite system | ✅ | Complete |
| Typing indicators | ❌ Day 6+ | Not implemented |
| Workspaces | ❌ Phase 2 | — |
| Public / Private Channels | ❌ Phase 2 | — |
| Reactions | ❌ Phase 2 | — |
| Rich text formatting | ❌ Phase 2 | — |
| File uploads | ❌ v3 | — |
| Search | ❌ v3 | — |

---

## Demo Scenario — ✅ Verified

```
1.  Register User A          ✅
2.  Register User B          ✅
3.  Log in as User A (tab 1) ✅
4.  Log in as User B (tab 2) ✅
5.  User A creates DM with B ✅
6.  User A sends a message   ✅
7.  User B sees it instantly ✅
8.  User B opens conversation ✅
9.  User A sees read receipt ✅
10. Close User B tab, A sees offline    ✅
11. Reopen User B tab, A sees online     ✅
```

---

## End of Phase 1 Summary: Retrospective

### ✅ Accomplished
- **Infrastructure & Auth**: Full Next.js & Express.js monorepo setup. Supabase Auth integrated securely with JWKS verification and automatic database trigger syncing to Prisma.
- **Messaging Core**: Direct Messaging functional, backed by PostgreSQL persistence with UUIDv7 indexing and cursor-based pagination. Full REST endpoints for Message Editing (`PATCH`) and Soft Deletion (`DELETE`) with socket broadcasts.
- **Real-Time Engine**: Socket.io handles instant delivery, editing, deletion, read receipts, and dynamic room joining. 11 events wired across the system.
- **Presence System**: Robust dual-write presence system (Upstash Redis + in-memory fallback) with multi-tab support.
- **Polished UI**: Optimistic UI, dynamic sidebars with unread counters, real-time presence indicators, message grouping, and responsive design.
- **Invite System**: Secure deep-linked invites with polymorphic resolvers, atomic consumption, and 24-hour rotation policy.
- **Documentation**: Comprehensive `.docs/` and `.agents/` documentation system including complete socket architecture documentation.

### 🟡 Deferred Technical Debt
- Soft-delete filtering in `getMessages`
- Pagination ordering from `createdAt` to `id`
- Race condition and non-transactional reads in message edit/delete
- Horizontal scaling of Socket.io (Redis Pub/Sub)

### 🔄 Key Deviations from Initial Plan
1. **Decoupled Conversation Metadata**: Introduced dedicated `CONVERSATION_UPDATE` socket event — server owns metadata authority.
2. **Presence Dual-Write**: In-memory Map fallback added alongside Redis for resilience.
3. **Structured Documentation**: Multi-tier documentation system (`.docs/`, `.agents/`, `public-docs/`).
4. **UX Overhauls**: Explicit 'Message' buttons, responsive layout, message grouping.
5. **Invite System**: Not in original Phase 1 plan but added as foundational infrastructure for Phase 2.
