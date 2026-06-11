# Daily Logs

## 4th June 2026
- Initialized Express + TypeScript backend server.
- Configured Prisma v7 with PostgreSQL adapter for Supabase.
- Finalized database schema (Users, Conversations, Messages) and ran initial migrations/seeds.
- Implemented and hardened end-to-end authentication flow using Supabase Auth.
  - Added Next.js Edge middleware for route protection.
  - Switched server-side API JWT verification to use ES256 JWKS local crypto (zero network overhead).
  - Implemented automatic user upserting to Prisma DB on first API request (handles OAuth users).
  - Added global 401 handling and disabled TanStack Query retries on 4xx.
  - Hardened password complexity validation.
  - Built forgot password flow (needs reset password page).

**Date**: 4th June 2026

**Completed**:
- Initialized Express + TypeScript backend server.
- Configured Prisma v7 with PostgreSQL adapter for Supabase.
- Finalized database schema (Users, Conversations, Messages) and ran initial migrations/seeds.
- Implemented and hardened end-to-end authentication flow using Supabase Auth (email/password & GitHub OAuth).
- Added Next.js Edge middleware for client-side route protection.
- Switched server-side API JWT verification to use ES256 JWKS local crypto (zero network overhead).
- Implemented automatic user upserting to Prisma DB on first API request.
- Added global 401 handling, disabled TanStack Query retries on 4xx, and hardened password complexity.
- Built forgot password flow and resolved OAuth callback race conditions.

**In Progress**:
- Setting up the remaining REST API architecture for conversations and messaging.

**Next Plan**:
- Build `/conversations` REST endpoints (DM creation, fetching list and single DM).
- Build `/messages` REST endpoints (send, fetch history with cursor pagination).
- Integrate Socket.io for real-time messaging.
- Integrate Upstash Redis for user presence tracking.
- Build UI: DM list sidebar, conversation view, and message input.

**Blockers**
● Any issues or dependencies: None. Local environment, Supabase Auth, and Prisma are fully synced and operational.

**Learning**
● One new thing that you learned today: Successfully implemented zero-network-overhead JWT verification by caching Supabase's ES256 JWKS public keys in the Express backend using the `jose` library, significantly improving protected route latency.

**Future Refactors (Tech Debt)**
- Implement `supabase.auth.onAuthStateChange()` centralized listener once Socket.io is added.
- Add TanStack Query cache clearing (`queryClient.clear()`) and socket disconnection on logout.
- Update `api.ts` response interceptor to explicitly attempt a token refresh on 401 before forcing a logout.
- Migrate auth state to a global Zustand store when needed for complex UI features (online status, workspace invites).

---

## 5th June 2026

**Date**: 5th June 2026

**Completed**:
- Built the complete frontend authentication UI including functional Login and Register pages.
- Established protected route layouts with Next.js router redirection.
- Fully implemented the Day 2 REST backend: `GET /conversations`, `POST /conversations`, `GET /messages`, and `POST /messages`.
- Built the primary chat UI: Sidebar with real-time user session profile widget, `ActiveConversation` layout, and paginated `MessageList`.
- Implemented and wired up DM creation via a `NewConversationModal` that successfully searches and initiates chats.
- Fixed a generic typography baseline shifting bug by migrating standard fonts to `Rubik`.
- Designed and integrated complete REST-based **Read Receipts** architecture (`PATCH /api/conversations/:id/read` + React Query mutation strictly firing on conversation enter).
- Implemented global API rate limiting for endpoints via in-memory IP mapping.

**In Progress**:
- Transitioning from REST architecture into real-time WebSockets logic.

**Next Plan**:
- Initialize Socket.io on the Express backend and establish client socket connections.
- Broadcast real-time `NEW_MESSAGE` events across connected clients for instantaneous DMs.
- Broadcast `READ_RECEIPT` events so clients can instantly see when their messages are read.
- Introduce Upstash Redis for global user presence tracking (Online/Offline status).

**Blockers**
  Any issues or dependencies: None. We resolved a minor git stash / file synchronization conflict today flawlessly, and the codebase is completely stable.

**Learning**
  One new thing that you learned today: When relying heavily on React `useEffect` for triggering analytics or read-receipt style mutations inside complex lists, using a `useRef` to manually flag execution perfectly guards against noisy array-dependency updates without violating the Rules of Hooks.

---

## 8th June 2026

**Date**: 8th June 2026

**Completed**:
- Implemented basic Socket.io connection and folder structure refactor.
- Established socket connection from client to server for event fanout.
- Created global environment URL configuration files.
- Improved CSS for the UI and enhanced socket error handling.
- Added visual unread message highlight feature in the sidebar.
- Implemented a user suggestions feature showing available users.
- Updated server build scripts (added tsup bundler, tsc-alias, and `prisma generate`).
- Addressed deployment issues and merged feature branches.

**In Progress**:
- Fixing deployment and routing issues.

**Next Plan**:
- Fix redirection issues upon login in the deployed app.
- Ensure WebSocket proxying works correctly in production.

**Blockers**
  Any issues or dependencies: Deployment routing and authentication redirection in production environment.

**Learning**
  One new thing that you learned today: Using `tsup` and `tsc-alias` provides a cleaner and faster build process for TypeScript server applications, simplifying absolute imports compilation.


---

## 9th June 2026

**Date**: 9th June 2026

**Completed**:
- **Build tooling**: Added tsup bundler and tsc-alias for production builds. Added `prisma generate` to build script.
- **CORS**: Fixed socket.io CORS to allow multiple comma-separated origins from `ALLOWED_ORIGINS` env var.
- **Presence system — Redis integration**: Fleshed out `presence.handler.ts` to broadcast `user:online` / `user:offline` / `presence:initial` events. Created `presenceStore.ts` with dual-write strategy (always writes to both Redis Sets + in-memory `Map<userId, Set<socketId>>`). In-memory fallback is always consistent because it's updated on every operation regardless of Redis availability.
- **Presence system — UI**: Built `PresenceIndicator` component (green/gray dot), `MessageStatus` component (pending/sent/read icons), `usePresence` hook (listens for all presence events). Updated `chatStore` with `onlineUsers` Set. Wired `Sidebar` and `ActiveConversation` to show presence indicators.
- **Socket refactoring**: Clean separation of `useGlobalSocket` — extracted event handling into `realtime/` module with `message.handlers.ts` (sidebar reordering, unread badge) and `conversation.handlers.ts` (read receipt cache updates). Added `createChatEventRouter` factory pattern.
- **Dynamic room joining**: On new DM creation, server now iterates active sockets and calls `socket.join()` for each participant. Emits `conversation:new` to each `user:<userId>` room. Client-side `useGlobalSocket` listens and prepends to sidebar cache.
- **Message soft-delete schema**: Added `deletedAt` (DateTime?) field to Message model. Created migration. Built `editMessage` service with validation (owns message, not deleted, non-empty). Added `$transaction` to `createMessage` for atomic message + conversation `updatedAt` update. Added `test-seed.ts`.
- **Deployment fixes**: Resolved redirection and routing issues for production environment.

**In Progress**:
- Message edit/delete REST endpoints not yet exposed (services exist).
- Cursor pagination still ordering by `createdAt` instead of `id`.

**Next Plan**:
- Expose `PATCH /messages/:id` and `DELETE /messages/:id` REST endpoints.
- Fix cursor pagination to use `id: "desc"` ordering (UUIDv7).
- Filter soft-deleted messages in `getMessages`.
- Begin Phase 2: Workspaces, channels, RBAC, reactions.

**Blockers**
  None.

**Learning**
  Two key architectural decisions today:
  1. Dual-write presence store — always write to both Redis Sets and an in-memory Map on every addSocket/removeSocket. This means the in-memory fallback is never stale, even if Redis becomes unavailable between operations. Reads prefer Redis, fall back to memory. This elegantly handles multi-tab scenarios.
  2. Dynamic socket joining for new conversations — instead of relying on reconnection, the server iterates `io.sockets.sockets` after creating a DM and joins each participant's sockets to the new room. Combined with `conversation:new` events sent to `user:<userId>` rooms, this provides instant room access without client-side reconnection logic.

---

## 10th June 2026

**Date**: 10th June 2026

**Completed**:
- Implemented dynamic numeric unread message counters in the sidebar to accurately track unseen messages per conversation.
- Improved the user search experience by adding an explicit 'Message' button when discovering new users, replacing the implicit full-row clickable area for better accessibility.
- Enabled message editing functionality, allowing users to modify their sent messages while ensuring strict ownership and validation checks.
- Enabled message deletion functionality, empowering users to safely remove messages from the conversation history.
- Refactored the real-time messaging engine to improve how conversation metadata (such as the latest message preview) is synchronized, resolving UI race conditions by enforcing strict server authority.
- Hardened the real-time user presence tracking system to ensure perfect synchronization of online/offline statuses, flawlessly handling scenarios where a user has multiple browser tabs open simultaneously.

**In Progress**:
- Preparing the messaging infrastructure to support group communication features, including Workspaces, Channels, and a new Message Requests flow.

**Next Plan**:
- Strengthen database transaction boundaries during message editing and deletion to prevent potential race conditions under heavy load.
- Improve data fetching logic to guarantee that deleted messages are strictly filtered out from the conversation history.
- Optimize message history pagination to utilize the monotonic properties of the database primary keys, ensuring perfectly stable chronological sorting.

**Blockers**
  None.

**Learning**
  One new thing that you learned today: Regularly reviewing the backend architecture against the intended user experience ensures that data integrity issues are caught before they scale to production.

---

## 11th June 2026

- **Critical race condition fix**: Fixed `deleteMessage` in `messages.service.ts` to compute `nextLatestMessageId` inside the Prisma `$transaction` using `tx.message.findFirst`, eliminating the race condition window that could corrupt `Conversation.latestMessageId` under concurrent deletions.
- **Fixed soft-delete leakage**: `getMessages` now filters `deletedAt: null`, preventing deleted messages from being sent to clients.
- **Fixed pagination ordering**: `getMessages` now orders by `id: "desc"` (UUIDv7) instead of `createdAt`, ensuring monotonic-safe cursor-based pagination.
- **Added Emoji Picker**: Integrated `emoji-picker-react` into `MessageInput.tsx` with a `Smile` icon button and popover, supporting dark/light theme via `next-themes`.
- **Added invite links for DMs**: Implemented invite link generation for DM conversations, integrated into the sidebar via `InviteModal` and `useInviteLink` hook.
- **Mobile UI improvements**: Added unread badge to the mobile back button in `ActiveConversation`, dynamic textarea heights, and fixed UI inconsistencies.
- **Accessibility improvements**: Improved accessibility for interactive elements.
- **Code deduplication**: Refactored code across the codebase to reduce duplication.
- **Branding update**: Updated the logo and favicon.

**Date**: 11th June 2026

**Completed**:
- Resolved 3 critical technical debt items: race condition in `deleteMessage`, soft-delete leakage in `getMessages`, and pagination ordering using `createdAt` instead of `id`.
- Added Emoji Picker to message input (`emoji-picker-react` library, dark/light theme support).
- Added invite link generation for DM conversations (sidebar integration).
- Fixed various UI inconsistencies and improved mobile responsiveness.
- Improved accessibility for interactive elements.
- Refactored code to deduplicate logic.
- Updated branding (logo and favicon).

**In Progress**:
- Phase 2 planning and technical debt cleanup (remaining: non-transactional reads in `editMessage`).

**Next Plan**:
- Fix non-transactional reads in `editMessage` service.
- Begin Phase 2: Workspaces, channels, RBAC, reactions.

**Blockers**
  None.

**Learning**
  One new thing that you learned today: Moving the `nextLatestMessageId` computation inside the Prisma `$transaction` callback using `tx.message.findFirst` eliminates the critical race condition window where concurrent deletions could corrupt the conversation's `latestMessageId`. The transaction's snapshot isolation ensures consistent reads within the same transaction boundary.

