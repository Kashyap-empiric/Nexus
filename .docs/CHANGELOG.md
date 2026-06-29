# Nexus — Changelog

> **Last Updated:** 2026-06-29  
> **Purpose:** Track all significant changes to the project in reverse chronological order.

---

## 2026-06-29

### Added
- **RightPanel Component**: Replaced monolithic `InfoPanel` with modular `RightPanel` — supports dynamic panes (About, Members, Pins, Threads, Pinned Messages) with slide-in/out animation and scroll position restoration on pane toggle.
- **AboutPanel Component**: New workspace channel about panel showing channel description, creator, creation date, and member count with formatted timestamps.
- **Scroll Restoration in MessageList**: `useMessageScroll` now preserves scroll position when toggling the right panel — prevents jarring jump when InfoPanel/RightPanel opens/closes.
- **Draft Persistence in MessageInput**: Draft message content persists across conversation switches and panel toggles using Zustand store, preventing accidental loss of unsent messages.
- **@Mention Autocomplete UI**: `MentionList` component with Tiptap `@mention` suggestion plugin — keyboard-navigable popover (`ArrowUp`/`ArrowDown`/`Enter`/`Tab`) displaying user avatar, username, and full name. `mentionSuggestion` integrates with `ConversationMember` data for workspace channel mentions.
- **Thread Participants Model**: New `ThreadParticipant` table (`[threadRootId, userId]` composite PK) with `isFollowing`, `notificationLevel` (ALL / MENTIONS / MUTED), and `joinedAt`. Prisma migration `20260629114200_add_thread_participants` with backfill for thread root authors, repliers, and mentioned users.
- **Thread Notification Desktop Gating**: Desktop notifications for thread replies now respect `replyNotifications` preference — fetches notification preferences from API if not in query cache before showing.
- **Channel Notification Desktop Gating**: Desktop notifications in channels respect `mentionNotifications` (when `@mentioned`) and `channelNotifications` (for general messages). DM notifications respect `dmNotifications` preference.
- **PRESENCE_UPDATE Socket Event**: New socket event constant for presence update broadcasts.
- **NotificationIcon Tests**: Unit tests for `NotificationIcon` component covering `MENTIONED_IN_MESSAGE` (AtSign), `INVITE_RECEIVED` (Mail), and unknown types (Bell).
- **LazyMarkdown Tests**: New test suite for LazyMarkdown component.
- **MentionList Tests**: Tests for MentionList keyboard navigation and rendering.
- **mentionSuggestion Tests**: Tests for Tiptap suggestion integration.
- **messages.api Tests**: New test suite for messages REST API.
- **useThreads Tests**: Tests for thread query hooks.
- **parseDate Utility**: Added `parseDate`/`formatDate`/`isToday`/`isYesterday` helpers in `shared/lib/utils.ts` for consistent date formatting across components.

### Changed
- **InfoPanel → RightPanel Refactor**: Replaced 290-line `InfoPanel` with modular 149-line `RightPanel` component. ActiveConversation now delegates panel content rendering to child components. Animation transitions updated for smoother pane open/close.
- **ChannelSidebarItem → WorkspaceChannelItem Redesign**: Major redesign of channel list items — restructured for improved visual hierarchy with channel icon, unread indicators, and hover actions. Delete/leave/visibility actions now use shadcn `AlertDialog` with destructive styling instead of `Dialog`.
- **WorkspaceSettingsModal AlertDialog Migration**: Leave Workspace action now uses `AlertDialog` with confirmation instead of direct button execution. Added `showLeaveDialog` state management.
- **Workspace Controller Error Handling**: Consolidated error mapping — replaced generic `ZodError` catch with typed `AppError` handling; added `ZodError` validation error extraction for duplicate workspace name conflicts using `issues` path filtering.
- **Server Email Service Refactor**: `email.ts` — replaced `any` types with proper generic constraints (`T extends Record<string, unknown>`); typed `personalizations` array with `ReplyTo`/`SendAt` interfaces.
- **Server Transaction Type Safety**: `transaction.ts` — replaced `prisma.$transaction` generic with explicit `Promise<unknown>` type.
- **Server Error Handler**: `errorHandler.ts` — replaced `any` cast with `Errback` type.
- **Socket Auth Middleware**: `socket/middlewares/auth.ts` — replaced `any` casts with typed `jwtVerify` errors.
- **Socket Rate Limiter**: `socket/middlewares/rateLimiter.ts` — replaced `any` casts with proper `Socket` type narrowing.
- **Conversations Repository/Service**: Fixed type assertions in `conversations.repository.ts` and `conversations.service.ts`.
- **Invites Module**: Fixed type safety in `invites.service.ts`, `invites.types.ts`, `userResolver.ts`, `workspaceResolver.ts`.
- **Messages Repository/Service**: Added `MessagesSendReturn` type, removed `any` casts from array creation, fixed notification content extraction.
- **Notifications Repository**: Removed unused imports and `any` types.
- **Test Mocks**: `mock-db.ts` and `mock-transaction.ts` — replaced `any` with proper type assertions.
- **Service Worker Navigation**: `AppLayoutShell` now wraps `router.push()` in try/catch to prevent crashes from malformed service worker navigation messages.
- **Test Setup**: Client test setup now loads `dotenv` from `.env.local` for consistent env var availability.
- **`.gitignore`**: Added `reviews/` directory to gitignore.

### Fixed
- **Right Panel Animation**: Fixed clunky right panel transition — replaced abrupt mount/unmount with CSS `transform`-based slide animation using `data-[state=open]` attributes for smooth 200ms enter/exit.
- **ChannelThreadsBrowser Animation**: Added `motion-animate` with `fadeIn` variants for thread list item transitions; proper `AnimatePresence` wrapping.
- **ThreadPanel/WorkspaceThreadsView Animation**: Enter/exit animations for thread panel in workspace threads view using framer-motion `AnimatePresence` with slide-in-right/slide-out-right.
- **`any` Types Removed (36 files)**: Eliminated all remaining `any` type casts across client and server codebases — replaced with proper TypeScript generics, union types, and type assertions. Server files: `batchInvite.processor.ts`, `fanOutNotification.processor.ts`, `sendEmail.processor.ts`, `email.ts`, `transaction.ts`, `errorHandler.ts`, `conversations.repository.ts`, `conversations.service.ts`, `invites.service.ts`, `invites.types.ts`, `userResolver.ts`, `workspaceResolver.ts`, `messages.repository.ts`, `messages.service.ts`, `messages.types.ts`, `notifications.repository.ts`, `users.controller.ts`, `workspaces.controller.ts`, `socket/middlewares/auth.ts`, `socket/middlewares/rateLimiter.ts`, `mock-db.ts`, `mock-transaction.ts`. Client files: `MessageInput.tsx`, `MessageList.tsx`, `useMessages.ts`, `AccountSettings.tsx`, `ChannelThreadsBrowser.tsx`, `ThreadPanel.tsx`, `WorkspaceThreadsView.tsx`, `AppLayoutShell.tsx`, `ActiveConversation.tsx`, `RightPanel.tsx`, `AboutPanel.tsx`, `chatStore.ts`, `useMessageScroll.ts`.
- **Service Worker Navigation Crash**: `AppLayoutShell` now catches errors from `router.push()` when service worker sends malformed navigation URLs.

### Documentation
- Full rewrite of all 13 `.qa/features/*.md` files with comprehensive format — each feature document now includes Goal, Current Status, High-Level Summary, Code Locations, Database schema, API endpoints with validation, Backend Implementation, Frontend Implementation, Existing vs Missing matrix, Expected Behavior Matrix, Current Flow diagrams, Missing Pieces checklist, Edge Cases table, Known Limitations, and Files Inspected listing.

---

## 2026-06-25

### Added
- **Thread Summaries API**: `getThreadSummaries` and `getThreadSummaryCounts` service methods for fetching thread activity per conversation. TanStack Query hooks (`useThreadsQuery`, `useThreadSummaryCounts`) on client for data fetching.
- **Workspace Threads Page**: Slack-style workspace-level threads view at `/workspaces/[slug]/threads` with card-based thread rows, channel pills, participant avatars, reply counts, and active indicators. Sidebar navigation entry added.
- **Channel Threads Browser**: Thread browser component for channel-level thread listing; Threads tab added to InfoPanel.
- **Message Actions Toolbar**: Copy/edit/delete hover toolbar and dropdown menu on thread replies in ThreadPanel. Delete confirmation AlertDialog with destructive styling.
- **Formatting Toolbar in Edit Mode**: Formatting toolbar (bold, italic, strikethrough, code) added to edit form for messages.
- **Discord-style Thread Icon**: Dedicated `ThreadIcon` component replacing `MessageSquare` for thread indicators across the app.
- **useOptimisticMessage Hook**: Utility hook for checking pending/optimistic message state.
- **Thread Connector Improvements**: Consecutive messages from same sender grouped with improved connector line rendering (rounded bottom corners for thread end).

### Changed
- **Thread Panel as Right Pane**: ThreadPanel now integrates as a right-side detail pane in workspace threads view instead of a full overlay.
- **Terminology Update**: Changed "Create Thread" to "Reply in thread" across the entire UI.
- **Editor Consolidation**: Refactored formatting toolbar and editor logic into reusable `MessageInput` component shared between main chat and threads.
- **Z-index Refactor**: Replaced runtime template literal z-index with inline style in overlay components for predictable stacking.
- **Mobile Sidebar Overlay**: Improved mobile sidebar backdrop visibility and info panel auto-open behavior.

### Fixed
- **Optimistic Reply Duplication**: `threadStore.addReply` now replaces pending optimistic placeholder instead of appending duplicate.
- **Auth Metadata Propagation**: Optimistic mutation now extracts `avatarUrl`/`fullName` from `user_metadata` in auth data.
- **Edit Button Visibility**: Edit button hidden for optimistic/pending thread replies.
- **Pending Status Display**: Optimistic thread replies correctly show pending state (70% opacity).
- **Participants Access**: Null-safe participants access in `WorkspaceThreadsView`.

### Documentation
- Full comprehensive update of all `.docs/`, `.agents/`, `.qa/`, `docs/`, and `work/` directories to reflect June 24-25 changes including thread summaries, workspace threads view, message actions toolbar, edit formatting, and UI refinements.

## 2026-06-24

### Added
- **Message Threads**: Complete thread implementation with dedicated `ThreadPanel`, `ThreadInput`, `threadStore` (Zustand), and `useThreadMessages` hook. Messages can be threaded via `threadRootId` with `threadReplyCount` and `lastThreadReplyAt` tracking. Inline reply context displays connector lines aligned with avatars. Optimistic updates for both main chat and thread messages.
- **Message Mentions**: New `MessageMention` model (join table `[messageId, userId]`), `MENTIONED_IN_MESSAGE` notification type with preference gating under `REPLIES` category.
- **Message Reactions**: New `MessageReaction` model (unique `[messageId, userId, emoji]`) with schema and migration — no endpoints or UI yet.
- **threadNotifications Preference**: New `User.threadNotifications` boolean (default true), gating `THREAD_REPLY` notification type.
- **isThreadBroadcast**: New `Message.isThreadBroadcast` flag for broadcasting thread replies to channel main timeline.

### Changed
- **Sidebar Navigation Refactor**: Derived navigation state from URL params (`useRouteState` hook) instead of Zustand `useChatStore`. Removed `usePathname` dependency, auto-redirect logic, and `lastVisitedChannels` tracking. Sidebar now receives `openSettings` prop for modularity.
- **User Footer**: Replaced `StatusSelector` component with `UserFooterMenu` — unified user dropdown with profile settings, status selection, and sign-out in the sidebar.
- **Message Group UI**: Removed message bubbles and right-alignment for sender messages. Unified chat aesthetic with left-aligned messages from all participants. Made thread reply connector lines brighter and properly aligned with avatars. Improved hover actions menu z-index and border styles.
- **Pinned Messages Panel**: Pinned messages now sorted chronologically (oldest first).
- **Push Notification Resilience**: `createAndDispatch()` push enqueue wrapped in `.catch()` — failures are logged instead of blocking notification creation.

### Fixed
- **Sender avatar alignment**: User profile display for root messages in threads now correctly shows sender avatar.

### Documentation
- Full update of all `.docs/`, `.qa/`, `.agents/`, `docs/`, and `work/` directories to reflect threads, mentions, reactions, sidebar refactor, and notification changes.

## 2026-06-22

### Fixed
- **Accepted/Declined invites now unclickable in BellPopover**: Accepted invites (detected via `metadata.accepted`) and declined invites (tracked via local state) are now non-interactive — no hover effects, disabled buttons, reduced opacity, and "Accepted"/"Declined" badges.
- **Client TypeScript errors**: Fixed 13 errors across 6 files (imports, type mismatches, unused directives, missing type params) — client now compiles clean.
- **Server TypeScript errors**: Fixed 2 TS2883 errors in `mock-db.ts` by adding explicit type annotations.
- **Server test environment**: Added `SUPABASE_SERVICE_ROLE_KEY` to test setup to fix 2 env-dependent test failures.
- **Server test assertion**: Fixed `sendMessageNotifications` test to match the batched `findMany` query and correct push payload format.
- **Client test**: Added `notificationUpdate` to expected router keys in `eventRouter.test.ts`.

### Changed
- **Deployment readiness**: All TypeScript compiles clean (client + server), all tests pass (334 total, 0 failures).

## 2026-06-19

### Added
- **Forgot/Reset Password Flow**: Complete password reset flow with `ForgotPasswordForm`, `ResetPasswordForm`, Supabase `resetPasswordForEmail` integration, PASSWORD_RECOVERY event handling, password visibility toggles, Zod validation (8-128 chars, match check)
- **New Notification Types**: Added `CHANNEL_MEMBER_ADDED`, `CHANNEL_MEMBER_REMOVED`, `ROLE_CHANGED` to NotificationType enum with Prisma migrations
- **AlertDialog Confirmation Migration**: Replaced native `window.confirm` with shadcn AlertDialog across `ManageChannelMembersModal`, `WorkspaceSettingsModal`, and `CustomRoleDropdown`
- **UI Polish**: Redesigned `CreateWorkspaceModal` with 2-column grid layout, `drawer` prop for mobile, `maxWidth` 960px; `MessageGroupItem` hover action buttons enlarged to `h-9 w-9` with `hover:ring`; mobile unread badge color standardized to `bg-destructive`
- **Pre-Demo Bug Fixes (Wave 1)**: Fixed 8 bugs — socket room dispatch optimization (`socketsJoin()`), desktop notification suppression when viewing conversation, deleted message stale content merge, tab title accumulation, logout state cleanup, onboarding slug collision (alphanumeric), `req.user!.id` null guard, profile form `isDirty` after save
- **Server Refactoring**: `invites.controller.ts` socket room joining on invite acceptance; `messages.service.ts` `excludeUserId` param for notifications; `socket.dispatcher.ts` now uses `io.in().socketsJoin()` for efficiency
- **Channel Management Modal**: New `ManageChannelMembersModal` for adding/removing channel members

### Fixed
- **C7**: Socket room dispatch no longer iterates ALL connected sockets — replaced with `socketsJoin()`/`socketsLeave()`
- **M36**: Deleted message no longer shows stale content — full message replacement instead of merge
- **m56**: Desktop notifications suppressed when viewing the relevant conversation
- **m15**: Tab title no longer accumulates `(1)(1)(1)` — proper regex prefix stripping
- **M13**: Logout now clears query cache, disconnects socket, resets chat store before redirect
- **H14**: Onboarding slug collision suffix changed to alphanumeric (human-readable)
- **H13**: `authMiddleware` now guards against missing `req.user`
- **M16**: Profile form `isDirty` correctly resets after save with null-coerced values

### Documentation
- Full update of all `.docs/`, `.qa/`, `.agents/`, `docs/`, and `work/` directories to current codebase state.

## 2026-06-18

### Fixed
- **Stale lockfile**: Removed `client/package-lock.json` (out of sync with package.json). `pnpm-lock.yaml` is the authoritative client lockfile.
- **Env validation**: Added Zod runtime validation for both `client/src/config/env.ts` and `server/src/config/env.ts` — previously used non-null assertions that would silently fail at runtime.
- **Debug log cleanup**: Removed leftover `console.log(allowedOrigins)` from `server/src/app.ts`.
- **Server scripts**: Added `lint` and `typecheck` scripts to `server/package.json`.

### Documentation
- **README.md**: Comprehensive rewrite with pnpm setup, package manager notes, evaluation scores, and script table.
- **`.docs/LIMITATIONS.md`**: Added findings from evaluation (no tests, in-memory rate limiter, string error handling, ESLint debt) along with resolutions for this session's fixes.
- **`.docs/CHANGELOG.md`**: Added this entry.
- **`.agents/AGENT_RULES.md`**: Added rules for env validation, lockfile discipline, typed errors, and test requirements.
- **Bug Tracking**: Created `work/BUGS.md` documenting glaring frontend errors found during analysis.
- **UI/UX Audit**: Created `work/UI-UX_PROBLEMS.md` listing inconsistencies in UI and UX (CSS + interactive + edge cases)

## 2026-06-17

### Added
- Comprehensive optimization audit (`work/optimization.md`) — full codebase analysis covering frontend, backend, database, realtime, Supabase, mobile, and build optimizations
- Performance testing procedures in `.qa/` — bundle size validation, render validation, websocket validation
- Agent performance standards in `.agents/AGENT_RULES.md` — performance review requirements added
- Performance monitoring documentation in `work/audits/`

### Changed
- Updated `.docs/LIMITATIONS.md` with new findings from optimization audit
- Updated `.docs/PROJECT_CONTEXT.md` with performance consideration notes

### Documentation
- Created `work/optimization.md` — comprehensive optimization audit with prioritized roadmap
- Created `work/audits/performance-audit.md` — detailed performance findings
- Updated `.qa/FEATURE_CHECKLIST.md` with performance test requirements
- Updated `.agents/AGENT_RULES.md` with performance review requirements
- Updated `work/logs/` with session progress

---

## 2026-06-16

### Added
- Channel member management (add/remove members from channels)
- Onboarding flow for newly registered users
- `responsive.md` — comprehensive responsive design audit

### Changed
- Standardized UI elements with consistent CSS classes
- Fixed inconsistent CSS spacing

### Fixed
- Sidebar navigation on mobile view

### Documentation
- Created formal `.agents/` policy files (AGENT_RULES, DEVELOPMENT_WORKFLOW, DOCUMENTATION_POLICY, QA_POLICY, CONTEXT_UPDATE_POLICY)
- Created `.docs/` knowledge base (PROJECT_CONTEXT, ARCHITECTURE, FEATURES, DATABASE, API_REFERENCE, ENVIRONMENT_VARIABLES, LIMITATIONS, CHANGELOG)
- Created `.qa/` directory with QA template files and feature checklists

---

## 2026-06-15

### Added
- Web Push Notifications with VAPID
- Push notification delivery for workspace channel events
- Favicon for push notification branding
- Notification preferences (push toggle, DM/mention/channel toggles)
- Profile settings page with avatar upload

### Changed
- UI improvements to profiles and settings pages

### Documentation
- Updated module docs for notifications
- Added notification architecture documentation

---

## 2026-06-12

### Added
- Workspace module (complete): workspaces, channels, membership, roles
- Channel member management (add/remove)
- Workspace invite flow
- Channel visibility (public/private)
- Backward-compatible database migration for workspaces
- Centralized environment variables (`config/env.ts`)

### Fixed
- Workspace creation bug
- Mobile sidebar issues
- Private channel socket room filtering (security fix)

### Changed
- Routing: workspace channels at `/workspaces/{slug}/channels/{channelId}`

---

## 2026-06-11

### Added
- Emoji picker to message input
- Invite system with batch invite support
- NestJS-style module structure for server controllers

### Fixed
- Race conditions in message deletion (transactional fix)
- Soft-delete filtering in getMessages
- Pagination ordering from `createdAt` to `id`
- UI inconsistencies across components
- Unread badge visibility on mobile
- Dynamic viewport heights for mobile (h-dvh)

### Changed
- Refactored code to deduplicate common patterns
- Replaced hardcoded member count with real member count badge

---

## 2026-06-10

### Added
- Message editing and deletion (REST + socket broadcasts)
- Conversation updates (sidebar reflects latest message)
- UI responsiveness improvements
- Message button in NewConversationModal user search
- Auth Zustand store for global state

### Changed
- CSS refinements throughout

### Documentation
- Updated docs and agent instructions

---

## 2026-06-09

### Added
- Socket.io integration (message delivery, presence, read receipts)
- Online/offline presence with Redis + in-memory fallback
- Read receipt UI (single/double checkmark)
- Clean separation of global socket events
- tsup bundler and tsc-alias for build

### Fixed
- Multiple comma-separated CORS origins
- Deployment configuration issues
- Build script to include prisma generate

---

## 2026-06-08

### Added
- Socket.io connection (basic)
- Message delivery via WebSocket
- Unread badge highlighting in sidebar
- User suggestions for new conversations
- Error handling improvements

### Changed
- Folder structure refactor for socket module
- Middleware converted to proxy

---

## 2026-06-05

### Added
- Direct messaging (full CRUD)
- Conversation sidebar with unread counts

---

## 2026-06-04

### Added
- Supabase Auth integration (login, register, OAuth)
- Edge middleware for route protection
- Prisma schema with migrations
- Database triggers for user sync

---

## 2026-06-03

### Added
- Initial project setup (Next.js 16 + Express.js monorepo)
- Prisma initialization
- Basic project structure
