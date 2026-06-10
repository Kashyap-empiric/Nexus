# Nexus — Phase 1 Plan (HISTORICAL ARCHIVE)

> **CRITICAL WARNING**: This file is an archived historical document representing the *intended* Phase 1 plan (5-Day Sprint). The sprint has concluded. 
> The system has massively deviated from this plan. Do **NOT** use this file as the source of truth for the codebase.
> **Instead, you must read `.docs/AS_IS_ARCHITECTURE.md` and `.docs/TECHNICAL_DEBT.md`.**
> 
> **Last Updated:** 2026-06-10 (Archived)

---

## Project Structure

```
nexus/
  client/
    src/
      app/
      constants/
      modules/ (auth, chat, landing, users)
      providers/
      shared/
  server/
    src/
      modules/ (conversations, messages, users)
      middlewares/
      socket/
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
| `Conversation` | `id` (String, PK) · `type` (enum: DM, CHANNEL) · `isPrivate` · `name` (nullable) · `workspaceId` (nullable) · `dmPair` (String?, unique) · `createdAt` · `updatedAt` |
| `ConversationMember` | `id` (String, PK) · `conversationId` (FK) · `userId` (FK) · `lastReadMessageId` (String?, FK → Message.id) · `joinedAt` |
| `Message` | `id` (String, PK) · `content` · `conversationId` (FK) · `userId` (FK) · `isEdited` (Boolean) · `deletedAt` (DateTime?) · `createdAt` · `updatedAt` |

Indexes and constraints:
- `ConversationMember`: `@@unique([conversationId, userId])` — prevents duplicate memberships
- `ConversationMember`: `@@index([userId, conversationId])` — required for sidebar/inbox query
- `Message`: `@@index([conversationId, id])` — message pagination ordered by UUIDv7 id
- `Conversation.dmPair`: `@unique` — enforces one-DM-per-user-pair at DB level

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
- `server/src/shared/socket-events.ts` — event name constants + payload types

**Updates to existing controllers:**
- `conversations.controller.ts`: POST create DM → dynamically join sockets + emit `conversation:new`
- `conversations.controller.ts`: PATCH read → emit `message:read` to room
- `messages.controller.ts`: POST message → emit `message:new` to room

### Client

- `client/src/shared/lib/socket.ts` — singleton socket.io-client with auth callback
- `client/src/shared/providers/socket-provider.tsx` — connection lifecycle management
- `client/src/modules/chat/hooks/useConversationSocket.ts` — inject `message:new` + `message:read` into cache
- `client/src/modules/chat/hooks/useGlobalSocket.ts` — global listeners for sidebar updates
- `client/src/modules/chat/hooks/useMessages.ts` — optimistic update lifecycle:
  - `onMutate`: inject `pending: true` message with tempId
  - `onSuccess`: swap tempId for real message
  - `onError`: rollback + styled error toast
- `client/src/modules/chat/store/chatStore.ts` — `socketStatus`, `onlineUsers`, `activeConversationId`, `drafts`
- `client/src/modules/users/hooks/usePresence.ts` — `presence:initial`, `user:online`, `user:offline`
- `client/src/modules/chat/components/PresenceIndicator.tsx` — green/gray dot
- `client/src/modules/chat/components/MessageStatus.tsx` — pending/sent/read states
- `client/src/modules/chat/realtime/` — event router factory pattern

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

**Status: 🟡 In Progress**

### To Implement

- [ ] Edit and delete messages
- [ ] The conversation sidebar should show number of unread messages for each conversation (if there are any)
- [ ] Message requests: instead of directly starting a conversation, a message request is sent with the message. Only upon acceptance does it appear in the direct messages list.


### Demo Scenario — ✅ Verified

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

## 🟡 Remaining Phase 1 Work

These items are infrastructure-complete but lack REST endpoint exposure:

| Item | Codebase Status |
|---|---|
| [ ] Message edit REST endpoint | `editMessage` service exists in `messages.service.ts` — no route registered |
| [ ] Message soft-delete REST endpoint | `deletedAt` field in schema + migration — no route registered |
| [ ] Filter soft-deleted messages | `getMessages` needs `where: { deletedAt: null }` |
| [ ] Switch pagination to `id` ordering | Currently uses `createdAt: "desc"` instead of `id: "desc"` |

---

## Phase 1 Scope Boundary

| Feature | In Scope | Out of Scope |
|---|---|---|
| Email/password auth | ✅ | |
| OAuth (Google, GitHub) | | ❌ Phase 2 |
| Direct Messages | ✅ | |
| Real-time delivery | ✅ | |
| Message history (paginated, cursor-based) | ✅ | |
| Read receipts | ✅ | |
| Presence (online/offline) | ✅ | |
| Message editing | 🟡 Service exists, no endpoint | |
| Message deletion | 🟡 Schema done, no endpoint | |
| Workspaces | | ❌ Phase 2 |
| Public / Private Channels | | ❌ Phase 2 |
| Reactions | | ❌ Phase 2 |
| Rich text formatting | | ❌ Phase 2 |
| File uploads | | ❌ v3 |
| Search | | ❌ v3 |

- [x] feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.

---

## End of Day 5 Summary: Phase 1 Review

As we reach the end of Day 5, here is a retrospective on the Phase 1 Sprint:

### ✅ Accomplished
- **Infrastructure & Auth**: Full Next.js & Express.js monorepo setup. Supabase Auth is integrated securely with JWKS verification and an automatic database trigger syncing to Prisma.
- **Messaging Core**: Direct Messaging is functional, backed by PostgreSQL persistence with UUIDv7 indexing and cursor-based pagination. Includes fully exposed REST endpoints for Message Editing (`PATCH`) and Soft Deletion (`DELETE`).
- **Real-Time Engine**: Socket.io handles instant delivery, read receipts (`message:read`), and dynamic room joining.
- **Presence System**: A robust dual-write presence system (Upstash Redis + in-memory fallback) provides real-time online/offline statuses across multi-tab scenarios.
- **Polished UI**: Optimistic UI message rendering, dynamic sidebars (including numeric unread message counters), real-time presence indicators, and user discovery components are live.

### 🟡 What is Left (Spillover)
- **Soft-Delete Filtering**: The backend `getMessages` service currently fails to filter out soft-deleted messages (`deletedAt: null`).
- **Pagination Optimization**: Need to switch cursor pagination from `createdAt: "desc"` to `id: "desc"` to fully leverage UUIDv7 monotonic properties.
- **Feature Backlog**: Implementing a "Message Requests" acceptance flow before surfacing DMs.

### 🔄 Deviations from the Initial Plan
1. **Decoupled Conversation Metadata (Architecture Change)**: Instead of the client inferring conversation updates (like `latestMessage` or `updatedAt`) directly from incoming message payloads, we introduced a dedicated `CONVERSATION_UPDATE` socket event. This delegates state authority entirely to the server and cleanly prevents race conditions.
2. **Presence Dual-Write System**: The plan initially focused heavily on Redis, but we adapted to include an in-memory Map fallback. This guarantees consistent state even if Upstash experiences latency or network blips between Redis calls.
3. **Structured Documentation Paradigms**: Mid-sprint, we pivoted to a rigorous multi-tier documentation system (`.docs/`, `.agents/`, `public-docs/`) to standardize how AI agents and humans collaborate and maintain project state.
4. **UX Overhauls**: Shifted towards more explicit UI call-to-actions, such as adding specific 'Message' buttons instead of relying on implicit, full-row clickable elements in search modals.
