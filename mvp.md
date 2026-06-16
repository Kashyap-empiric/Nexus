# Nexus MVP — Current State

Nexus is a real-time messaging and collaboration platform (Slack/Discord-like). Full-stack TypeScript monorepo with Next.js 16 + Express.js + PostgreSQL + Socket.io.

---

## Completed MVP Features

### Auth & User Management
- **Supabase Auth** with email/password + GitHub OAuth
- **Local JWKS verification** — ES256 tokens verified server-side with zero network overhead
- **Database trigger** (`SUPABASE_QUERIES.sql`) syncs `auth.users` → Prisma `User` on signup
- **401 interceptor** refreshes expired tokens via `supabase.auth.refreshSession()`
- **Per-component loading state** via `useAuth()` hook
- **Username/password registration** with Zod schema validation (email, password strength, confirm password)
- **Email confirmation UI** — login page reads `?registered=true&confirm=true` params and shows banner

### Direct Messages
- **One-to-one conversations** with `dmPair` deduplication (`uuid1:uuid2` sorted, unique constraint)
- **DB trigger** enforces 2-member limit on DMs
- **Conversation list** in sidebar with latest message preview

### Real-Time Messaging
- **Socket.io** with 15+ events across conversation, user, and workspace rooms
- **Message send/edit/delete** via WebSocket (primary) + REST fallback
- **Cursor-based pagination** using UUIDv7 monotonic ordering
- **Message soft-delete** (`deletedAt` column)
- **Optimistic updates** client-side via TanStack Query `onMutate`/`onSuccess`/`onError`
- **Read receipts** tracked via `ConversationMember.lastReadMessageId`
- **Inline replies** — `replyToId` self-relation on Message, reply banner + quote block in UI

### Presence System
- **Redis-backed** (Upstash) with in-memory Map fallback
- **Socket ID sets** per user (multi-tab support)
- **24h TTL** reset on every `SADD`
- **Server startup flush** — stale keys cleared on restart
- Events: `user:online`, `user:offline`, `presence:initial`

### Workspaces & Channels
- **Workspace CRUD** with auto-generated slugs (collision appends random suffix)
- **Roles**: OWNER, ADMIN, MEMBER with promote/demote endpoints
- **Public channels** — auto-join all workspace members on creation
- **Private channels** — restricted to selected `ConversationMember` records
- **`#general` channel** auto-created on workspace creation, protected from rename/delete
- **Channel context menu** (rename, delete)
- **Member list panel** (Discord-style right panel) with presence indicators + role badges
- **Socket events**: `channel:update`, `member:update`, `workspace:update`

### Invite System
- **Deep-linked invites** for USER, CONVERSATION, WORKSPACE types
- **24h active link rotation** — regenerating a new invite revokes the previous one
- **Atomic consumption** via raw SQL transaction
- **Batch invite** support (`POST /workspaces/:id/invite-multiple`)
- **Invite by email or username**

### Notifications
- **In-app notifications** — BellPopover with unread badge, infinite-scroll page, socket delivery
- **Web Push notifications** — VAPID-based via `web-push`, service worker handles `notificationclick`
- **Notification preferences** (push, DM, mention, channel toggles) — saved on User model
- **Server-side `createAndDispatch`** wired into invites, workspace joins, channel creation, and replies
- **Push subscription management** (subscribe/unsubscribe with rate limiting)

### User Profiles & Settings
- `GET/PATCH /api/users/me` for profile editing
- **Shared Settings Modal** (`?settings=tab` URL-driven) with:
  - **Profile tab** — edit fullName, avatar, bio
  - **Appearance tab** — Light/Dark/System theme toggle (`next-themes`)
  - **Notifications tab** — notification preference toggles
- **Avatar upload** to Supabase Storage (`avatars` bucket) with image type/size validation
- **User status** (AVAILABLE, AWAY, DND, INVISIBLE) with status text

### Onboarding Flow
- **3-step wizard** (Profile → Workspace → Done) with step progress indicator
- **Skip workspace option** — users can skip workspace creation and land on `/conversations`
- **Auto-generated workspace name** from user's full name
- **Avatar upload** during profile step (non-blocking — toast on failure)
- **Cache invalidation** on completion — refetches profile and workspace queries

### Markdown Rendering
- `react-markdown` + `remark-gfm` for bold, italic, code blocks, blockquotes, lists, links
- Links open in new tab with `rel="noopener noreferrer"`
- Inline code and code block styling

### Rate Limiting
- REST general: 100 req/min per user
- REST message send: 20 req/10s per user
- Socket.io message events: 20 events/10s per connection
- Push subscribe/unsubscribe: separate rate limiter

### UI/UX
- **Shadcn UI** components with Zinc theme
- **InfoPanel** with About, Members, and Pins tabs
- **Empty state** for conversations with no messages
- **Loading skeleton** during auth initialization
- **Sonner toasts** for errors and notifications
- **Responsive** layout with mobile auth header

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.7, TypeScript, Tailwind CSS 4 |
| State | TanStack Query 5, Zustand 5 |
| Backend | Express.js 5, TypeScript |
| Real-time | Socket.io 4 |
| Database | Supabase PostgreSQL, Prisma 7 |
| Auth | Supabase Auth + local JWKS (jose) |
| Cache | Upstash Redis |
| Deployment | Render (server), Vercel (client) |
| Package | pnpm (client), npm (server) |

---

## Known Bugs & Technical Debt

### Critical
- `username` not `@unique` in Prisma schema — duplicate usernames possible (breaks mentions, invites, search)

### Medium
- `isPrivate` (`default(true)`) contradicts `visibility` (`default(PUBLIC)`) on Conversation model
- `dispatchUserProfileUpdate` called before `res.json()` — fragile ordering
- No `validate` middleware on onboarding route — inconsistent error shapes
- `checkConversationAccess` doesn't check soft-deleted conversations (no `deletedAt` on Conversation — hard-delete only)
- AuthProvider + AuthGate race on post-login redirect (visual flash)
- `fullName` not forwarded to SupAuth metadata during registration
- No rate limiting on `/onboarding/complete` endpoint
- Read receipts for channels not showing (undefined `partnerLastReadMessageId`)
- `editMessage` has non-transactional reads
- No workspace creation path from conversations page (user who skips onboarding can't create one)

### Low
- `handleSignIn` called twice on first login (`INITIAL_SESSION` + `SIGNED_IN`)
- No error handling for socket connect failure in `handleSignIn`
- No CSRF protection on Express endpoints
- No auth request logging
- Login error messages are raw Supabase errors (not user-friendly)
- Slug collision uses random suffix — ugly and not communicated to user

---

## Quick Wins (Improvements, Not New Features)

These can be done in small amounts of time by an agent:

1. **Add `@unique` to `username`** in Prisma schema + migration + username availability endpoint + client validation
2. **Fix `isPrivate` default** — change to `false` to match `visibility: PUBLIC`
3. **Swap `dispatchUserProfileUpdate` to after `res.json()`** in onboarding controller
4. **Add rate limiter** to `/onboarding/complete` route
5. **Forward `fullName`** to Supabase `user_metadata` during registration
6. **Add workspace creation button** to conversations empty state
7. **Fix AuthProvider redirect check** — `/login` and `/register` don't start with `/auth` path
8. **Deduplicate `handleSignIn` calls** — skip call on `SIGNED_IN` if `INITIAL_SESSION` already connected
9. **Add socket connect error handling** in `handleSignIn` with toast + retry
10. **Map Supabase error messages** to user-friendly strings in login/register
