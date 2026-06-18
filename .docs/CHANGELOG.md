# Nexus — Changelog

> **Last Updated:** 2026-06-18  
> **Purpose:** Track all significant changes to the project in reverse chronological order.

---

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
