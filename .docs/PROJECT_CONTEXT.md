# Nexus — Project Context

> **Last Updated:** 2026-06-19  
> **Purpose:** Single source of truth for the current system state. Agents must read this before any feature work.

---

## 1. Project Overview

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo. It is a Slack-clone with workspaces, channels, DMs, in-app notifications, and web push notifications.

**Repository:** `nexus/`  
**Active Branch:** `feat/ui` (actively developed since June 19)  
**Deployment:** Render (server), Vercel (client — planned)

---

## 2. Implementation Status

### ✅ Fully Implemented

| Feature | Notes |
|---------|-------|
| Auth (Supabase + JWKS) | Email/password + GitHub OAuth. Edge middleware route protection. |
| Direct Messages | Full CRUD with dmPair deduplication. |
| Real-time Messaging | Socket.io: message send, edit, delete, read receipts. |
| Message Editing & Deletion | REST endpoints with socket broadcasts. Soft-delete. |
| Presence (Online/Offline) | Redis + in-memory dual-write. Multi-tab support. |
| Read Receipts | Single checkmark (sent) / double checkmark (read). Channels limited. |
| Invite System | Secure deep-linked invites (USER, CONVERSATION, WORKSPACE, CHANNEL). Batch invite support. |
| Workspaces | Full CRUD with roles (OWNER/ADMIN/MEMBER). Slug-based routing. |
| Channels | Public/Private channels within workspaces. Auto-join for public. |
| In-App Notifications | Bell popover, unread badges, infinite scroll page, socket delivery. |
| Web Push Notifications | VAPID-based. Subscription management via API. |
| User Profiles | Username, display name, avatar, bio, status. |
| Settings | Profile, Appearance (theme), Notifications preferences. |
| Markdown Rendering | Bold, italic, code, lists, blockquotes, links via react-markdown. |
| Responsive UI | Mobile-first with md: breakpoints. Safe area support. |
| Onboarding | Multi-step wizard (profile → workspace). |
| Channel Member Management | Add/remove members from channels via Manage Members modal. |

### 🟢 Recently Completed (June 19)

| Feature | Details |
|---------|---------|
| Forgot/Reset Password Flow | Full Supabase `resetPasswordForEmail` flow with PASSWORD_RECOVERY handling, visibility toggles, Zod validation |
| AlertDialog Confirmation Migration | Replaced `window.confirm` across all modals with shadcn AlertDialog |
| New Notification Types | `CHANNEL_MEMBER_ADDED`, `CHANNEL_MEMBER_REMOVED`, `ROLE_CHANGED` |
| Pre-Demo Bug Fixes (Wave 1) | 8 critical/major bugs fixed (socket dispatch, notifications, logout, onboarding, etc.) |
| Socket Room Optimization | `io.in().socketsJoin()` replacing per-socket `fetchSockets()` iteration |
| Password Visibility Toggles | Both login and register forms now support show/hide password |
| Manage Channel Members Modal | Dedicated modal for adding/removing channel members |
| CreateWorkspaceModal Redesign | 2-column grid, mobile drawer, improved responsive classes |

### 🟡 Partially Implemented / Known Issues

| Feature | Issue |
|---------|-------|
| Channel Read Receipts | `partnerLastReadMessageId` undefined for channels — double checkmark never shows. |
| Message Edit Transaction | `getMessageById` called outside `$transaction`. |
| Conversation UpdatedAt | Editing a message doesn't bump sidebar position. |
| Push Subscription Lifecycle | No proactive re-subscription on `pushsubscriptionchange` events. |
| Server Scaling | Presence system's in-memory Map prevents horizontal scaling. |
| Typing Indicators | Constants defined, client-side debounce not implemented |
| Channel List Polling | Uses 5s polling instead of socket events for channel updates |

### ❌ Not Yet Started

| Feature | Priority |
|---------|----------|
| Reactions (emoji) | Medium |
| Mentions (@user) | Medium |
| File Uploads | Low |
| Global Search / Cmd+K | Low |
| Message Threads | Low |
| URL Unfurling | Low |
| Emoji Reactions | Low |

---

## 5. Testing Status

A comprehensive test suite is now in place (added 2026-06-19):

| Area | Details |
|------|---------|
| Test Runner | Vitest v4.1.9 with Supertest |
| Test Files | 17 passed, 0 failed |
| Tests | 134 passed, 0 failed |
| Duration | 2.88s |
| Coverage | Unit + Integration |
| Test Database | Docker Postgres 16 Alpine |
| Migration Tests | Additive-only migration validation |

Test infrastructure includes: mock DB, mock transaction wrappers, auth middleware tests, conversations schema/service, messages schema/service, notifications schema, onboarding schema, users schema, workspaces schema, JWT utils, upload utils, error handler, rate limiter, requireMember, validate middleware, health endpoint, API integration.

## 6. Performance Considerations

A comprehensive optimization audit was conducted on 2026-06-17. Key findings:

**Bundle Size:** Heavy components (emoji-picker-react ~200KB, react-markdown ~50KB) are eagerly imported. Dynamic imports recommended.

**Rendering:** No React.memo usage — `MessageGroupItem` and sidebar items re-render on every parent state change.

**Cache Strategy:** Socket handlers invalidate broad query caches ("users", "workspaces", "conversations") on every status/presence change. Targeted `setQueryData` recommended.

**Stale Time:** QueryClient has no `staleTime` configured (defaults to 0), causing refetches on every navigation.

**Push Notifications:** `sendMessageNotifications` is awaited in the message handler, blocking the callback by 50-150ms.

**Server Logging:** Extensive `console.log` in production paths (push.service.ts, notifications.service.ts).

**Target Scale:** 10–100 users. Current architecture handles this without changes.

Full report: `work/optimization.md`

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js | ^16.2.7 |
| State Management | TanStack Query | ^5 |
| Client State | Zustand (chatStore) | — |
| Backend Framework | Express.js | ^4 |
| Real-time | Socket.io | ^4 |
| Database | PostgreSQL (Supabase) | — |
| ORM | Prisma | 7.x |
| Presence Cache | Upstash Redis | — |
| Auth | Supabase Auth + local JWKS | — |
| Package Manager | pnpm (root) / npm (apps) | — |
| Styling | Tailwind CSS v4 + shadcn/ui | — |

---

## 4. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `development` | Integration branch |
| `feat/ui` | Current active branch |
| `staging` | Pre-release testing |
