# Nexus — Project Context

> **Last Updated:** 2026-06-29
> **Purpose:** Prerequisite knowledge for working on this codebase. Current state, architecture constraints, and recent history.

---

## What is Nexus

Nexus is a real-time messaging application — workspaces, channels, DMs, presence tracking, push notifications, invites, and message pinning. It runs as a TypeScript monorepo with two applications:

- **`client/`** — Next.js 16 frontend (port 3001)
- **`server/`** — Express.js 5 backend (port 4000)

Communication occurs over HTTP (REST via Axios) and WebSockets (Socket.io).

---

## Current State (June 29)

All compilation and tests pass:

| Check | Result |
|-------|--------|
| Client TypeScript | 0 errors |
| Server TypeScript | 0 errors |
| Client ESLint | 0 errors (warnings pre-existing) |
| Client tests | Tests pass |
| Server tests | Tests pass |

Significant UI and infrastructure improvements have been made: InfoPanel replaced with modular RightPanel with About view, scroll restoration, and draft persistence. @mention autocomplete implemented with Tiptap integration and keyboard-navigable dropdown. Thread participants model added with follow/unfollow API and notification levels. Desktop notifications now gate against user preferences. All `any` type casts removed across 36 files. AlertDialog confirmations standardized for all destructive actions.

---

## Stable Areas

These parts of the system are functioning correctly and have reasonable test coverage:

**Real-time messaging.** Messages appear via optimistic UI, edits and deletes sync through Socket.io, read receipts work for DMs. Threads support with dedicated panel and optimistic updates. The dual-delivery pattern (ack callback for sender + room broadcast for recipients) handles temp ID replacement cleanly.

**Module architecture.** Each feature is separated into `routes → controller → service → repository` on the server and dedicated module directories on the client. The socket dispatcher pattern keeps emission paths traceable.

**Authentication.** JWKS-based verification with zero network calls per request. Supabase Auth handles OAuth, session management, and user lifecycle. Edge middleware protects Next.js routes.

**Presence tracking.** Dual-writes to Redis and an in-memory Map. Multi-tab aware — a user appears offline only when all their sockets disconnect. Reconnection is handled gracefully.

**Test coverage.** 334 tests across client and server covering services, schemas, middleware, and socket handlers.

---

## Production Constraints

These issues prevent horizontal scaling and will need to be addressed before deploying with multiple server instances.

| Issue | Impact |
|-------|--------|
| Presence tracking uses an in-memory Map | Each server instance only knows about its own connected sockets. Multi-instance deployment breaks presence. |
| Rate limiter is in-memory | Token buckets are per-instance. Rate limits are not shared across instances. |
| Socket.io has no Redis adapter | Rooms are not shared across instances. Messages only reach clients connected to the same server. |
| Push notifications block the request path | `sendPushNotifications()` adds 50–150ms to every message send. Should be a background job. |

---

## Areas for Improvement

These are functional but not optimal. They degrade gracefully under small-team usage but would need attention before scaling.

| Issue | Details |
|-------|---------|
| Channel read receipts | `partnerLastReadMessageId` is undefined for channels. The double checkmark never displays for channel messages. |
| Message search uses `LIKE %query%` | No full-text search index. Acceptable for small message volumes but will degrade beyond ~50K messages. |
| Channel list uses 5-second polling | Should use socket events like the rest of the real-time infrastructure. |
| No `React.memo` usage | The message list re-renders entirely on parent state changes. Fine for current scale, wasteful as conversations grow. |
| No `staleTime` on TanStack Query client | All queries are immediately stale, causing refetches on every navigation. |
| Typing indicators lack client-side debounce | Events fire on every keystroke. The server infrastructure is in place; only client throttling is missing. |
| Push notifications query members individually | No batching — N+1 queries per message send. Refactor to `findMany` with `WHERE userId IN (...)` would resolve this. |
| Push subscription lifecycle not handled | No handler for `pushsubscriptionchange` events from the browser. Subscriptions may go stale. |

---## Recent Changes (June 29 — RightPanel, @Mentions, Thread Participants, Type Cleanup)

### RightPanel with About View
- Replaced monolithic `InfoPanel` with modular `RightPanel` supporting dynamic panes (About, Members, Pins, Threads)
- Created `AboutPanel` showing channel description, creator, creation date, member count with formatted timestamps
- Added scroll position restoration when toggling right panel
- Added draft persistence in MessageInput across conversation switches
- Slide-in/out CSS transform animation using `data-[state=open]` attributes

### @Mention Autocomplete
- `MentionList` component with keyboard-navigable dropdown (ArrowUp/Down/Enter/Tab/Escape)
- `mentionSuggestion` plugin integrating Tiptap Mention extension with `ConversationMember` data
- Popup rendered via Tippy.js at cursor position
- Avatar, username, and full name display in mention suggestions
- Rendered messages highlight @mentions with `mention-chip` styling

### Thread Participants
- New `ThreadParticipant` table (`[threadRootId, userId]` composite PK) with `isFollowing`, `notificationLevel` (ALL/MENTIONS/MUTED), and `joinedAt`
- Prisma migration with backfill for thread root authors, repliers, and mentioned users
- API endpoints: POST follow, DELETE unfollow, PATCH update notification level
- Client hooks: `useFollowThread`, `useUnfollowThread`, `useUpdateThreadNotifications`

### Desktop Notification Gating
- Thread reply desktop notifications respect `replyNotifications` preference
- Channel desktop notifications respect `mentionNotifications` (@mentioned) and `channelNotifications`
- DM desktop notifications respect `dmNotifications` preference
- Preferences fetched from API if not in cache

### Type Cleanup
- All `any` type casts removed across 36 files (client and server)
- Server: email.ts, transaction.ts, errorHandler.ts, repositories, services, socket middlewares
- Client: MessageInput, MessageList, useMessages, AppLayoutShell, ThreadPanel, RightPanel, etc.

### AlertDialog Standardization
- WorkspaceSettingsModal: Leave Workspace → AlertDialog with confirmation
- WorkspaceChannelItem: Delete channel, Leave channel, Change visibility → AlertDialog with destructive styling

### Socket Events
- Added `PRESENCE_UPDATE` socket event constant

## Recent Changes (June 24–25 — Threads, Sidebar Refactor, Thread Enhancements)

The `feat/threads` branch was merged into `development`, and subsequent thread enhancements have been added:

### June 24 — Threads Initial Release
- **Message Threads** — Dedicated `ThreadPanel` with `ThreadInput`, Zustand thread store, optimistic updates for both main chat and threads. Thread replies tracked via `threadRootId` with `threadReplyCount` and `lastThreadReplyAt`.
- **Message Mentions** — `MessageMention` join table, `MENTIONED_IN_MESSAGE` notification type (categorized under `REPLIES` preference).
- **Message Reactions** — `MessageReaction` model with unique `[messageId, userId, emoji]` constraint. Schema only — no endpoints or UI yet.
- **threadNotifications Preference** — New boolean toggle on `User` model for thread reply notifications.
- **Sidebar Refactor** — Navigation state derived from URL (`useRouteState`) instead of Zustand store. Removed `usePathname`, auto-redirect logic, and `lastVisitedChannels`.
- **UserFooterMenu** — Replaced `StatusSelector` with unified user dropdown (profile, status, sign-out).
- **Message Display Refinements** — Removed message bubbles and right-alignment. Thread connector lines aligned with avatars. Pinned messages sorted chronologically.
- **Push Resilience** — Notification push enqueue failures caught and logged instead of blocking the creation path.

### June 25 — Thread Enhancements & UI Polish
- **Thread Summaries API** — `getThreadSummaries` and `getThreadSummaryCounts` service methods with TanStack Query hooks for fetching thread activity per conversation.
- **Workspace Threads Page** — Slack-style workspace-level threads view at `/workspaces/[slug]/threads` with card-based thread rows, channel pills, participant avatars, reply counts, and active indicators. Sidebar navigation entry added.
- **Channel Threads Browser** — Thread browser component for channel-level thread listing; Threads tab added to InfoPanel.
- **Message Actions Toolbar** — Copy/edit/delete hover toolbar and dropdown menu on thread replies in ThreadPanel. Delete confirmation AlertDialog with destructive styling.
- **Formatting Toolbar in Edit Mode** — Formatting toolbar (bold, italic, strikethrough, code) added to edit form for messages.
- **Discord-style Thread Icon** — Dedicated `ThreadIcon` component replacing `MessageSquare` for thread indicators across the app.
- **Thread Panel as Right Pane** — ThreadPanel integrates as a right-side detail pane in workspace threads view.
- **Editor Consolidation** — Refactored into reusable `MessageInput` component shared between main chat and threads.
- **Optimistic Reply Fix** — `threadStore.addReply` replaces pending placeholder instead of appending duplicate.
- **Auth Metadata Fix** — Optimistic mutation extracts `avatarUrl`/`fullName` from `user_metadata`.
- **Z-index Refactor** — Replaced runtime template literal z-index with inline style in overlay components.

## Recent Changes (June 19–22)

The last push addressed password reset, notification types, socket optimization, and a wave of bug fixes:

- **Password reset flow** — Complete flow with email, token verification, Zod validation
- **AlertDialog migration** — All `window.confirm()` calls replaced with shadcn AlertDialog
- **New notification types** — `CHANNEL_MEMBER_ADDED`, `CHANNEL_MEMBER_REMOVED`, `ROLE_CHANGED`
- **Socket room optimization** — Replaced `fetchSockets()` iteration with `socketsJoin()` — O(1) per room instead of O(n) per socket
- **Bug fixes** — Desktop notification suppression when viewing conversation, tab title accumulation, logout state cleanup, onboarding slug collision, `req.user` null guard, profile form `isDirty` state
- **Channel management modal** — `ManageChannelMembersModal` for adding/removing channel members
- **Invite acceptance socket joining** — Dynamically joins workspace/channel rooms on invite resolve
- **TypeScript and ESLint cleanup** — All errors resolved across client and server

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 + React 19 | Application framework, App Router |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first CSS, component primitives |
| Server state | TanStack Query v5 | Caching, optimistic updates, pagination |
| UI state | Zustand v5 | Socket status, presence, typing indicators |
| Backend | Express.js 5 | HTTP server |
| Real-time | Socket.io v4 | WebSocket with long-polling fallback |
| Database | PostgreSQL via Prisma 7 | ORM with auto-generated types |
| Auth | Supabase Auth + local JWKS | Session management, OAuth |
| Presence cache | Upstash Redis | Serverless Redis (HTTP-based) |
| Emails | SendGrid | Transactional email |
| Push | Web Push API (VAPID) | Browser notifications |

---

## Key File Locations

### Server

| Purpose | Path |
|---------|------|
| Database schema | `server/prisma/schema.prisma` |
| REST routes | `server/src/modules/<name>/<name>.routes.ts` |
| Socket events (shared) | `server/src/shared/socket-events.ts` |
| Socket dispatcher | `server/src/socket/socket.dispatcher.ts` |
| Auth middleware | `server/src/middlewares/auth.ts` |
| Env validation | `server/src/config/env.ts` |
| Presence tracking | `server/src/socket/presenceStore.ts` |
| Push notifications | `server/src/jobs/processors/pushNotification.processor.ts` |
| Job queues | `server/src/jobs/` |
| Feature modules | `server/src/modules/` |
| Socket infrastructure | `server/src/socket/` |

### Client

| Purpose | Path |
|---------|------|
| Socket events (shared) | `client/src/socket/socket-events.ts` |
| Event router | `client/src/socket/eventRouter.ts` |
| Env validation | `client/src/config/env.ts` |
| Feature modules | `client/src/modules/` (incl. `threads/`) |
| Socket infrastructure | `client/src/socket/` |
| Shared UI components | `client/src/shared/` |
| Next.js pages | `client/src/app/` |

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — stable, deployed |
| `development` | Integration — active work branch |

All current work is on `development`. The `feat/threads` branch has been fully merged.

---

## Onboarding Path

1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — Full system reference
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architecture diagrams and patterns
3. [`DATABASE.md`](./DATABASE.md) — Schema and access patterns
4. [`API_REFERENCE.md`](./API_REFERENCE.md) — Endpoint catalog
5. [`LIMITATIONS.md`](./LIMITATIONS.md) — Known issues before contributing
