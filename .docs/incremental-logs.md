# Incremental Logs

> This file is the most detailed source of progress logs. Add detailed logs for every meaningful change made to the project here.

## 10th June 2026 - Documentation System Setup

- **Action**: Established the documentation structure and standard guidelines for agents.
- **Details**: 
  - Updated `.agents/00-instructions.md` with new `Documentation Rules`.
  - Created `.docs/major-changes.md` to track significant architectural shifts and the reasoning behind them.
  - Initialized the `public-docs/` directory to serve as the main documentation portal for the project.
  - Set up `public-docs/DOCUMENTATION.md` and module-specific documentation.
  - Standardized the use of `incremental-logs.md` as the most granular log file for all tasks.
- **Files Touched**:
  - `.agents/00-instructions.md`
  - `.docs/incremental-logs.md`
  - `.docs/major-changes.md`
  - `public-docs/DOCUMENTATION.md`
  - `public-docs/file-structure.md`
  - `public-docs/modules/*.md`

## 10th June 2026 - Real-time Conversation Metadata & Presence Fix

- **Action**: Implemented the `CONVERSATION_UPDATE` socket event architecture, fixed a presence race condition, and added sidebar conversation search.
- **Details**:
  - Refactored `messages.service.ts` to return `conversationMetadata` natively inside transactions to avoid extra database queries.
  - Introduced `CONVERSATION_UPDATE` to handle `latestMessage`, `updatedAt`, and `latestMessageId` independently of message payloads.
  - Stripped conversation mutation logic from client-side `message.handlers.ts` and `cacheHelpers.ts`.
  - Moved socket presence listeners (`INITIAL_PRESENCE`, etc.) directly into `SocketProvider.tsx` to fix a race condition where the connection happened before listeners were attached.
  - Implemented a local filter for the sidebar search bar.
- **Files Touched**:
  - `server/src/modules/messages/messages.service.ts`
  - `server/src/modules/messages/messages.controller.ts`
  - `server/src/socket/handlers/message.handler.ts`
  - `client/src/shared/socket-events.ts`
  - `client/src/modules/chat/realtime/conversation.handlers.ts`
  - `client/src/modules/chat/realtime/message.handlers.ts`
  - `client/src/modules/chat/utils/cacheHelpers.ts`
  - `client/src/shared/providers/socket-provider.tsx`
  - `client/src/modules/chat/components/Sidebar.tsx`

## 10th June 2026 - UI Improvements

- **Action**: Improved New Conversation UI.
- **Details**: feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
- **Files Touched**:
  - `client/src/modules/chat/components/NewConversationModal.tsx`
  - `client/src/modules/chat/components/MessageList.tsx`
- [Thursday 11 June 2026 11:10:07 AM IST] Added v3.1 Secure Deep-Linked Invite System (frontend & backend implementation, raw SQL atomic updates).
- [Thursday 11 June 2026 11:13:08 AM IST] Refactored invites logic into invites.service.ts and invites.types.ts to separate business logic from the controller.
- [Thursday 11 June 2026 11:41:26 AM IST] Expanded invite entry points across Nexus UI. Created reusable InviteModal, useInviteModal hook, and added proper POST /api/invites/generate backend endpoint.
- [Thursday 11 June 2026 11:46:10 AM IST] Fixed auth flaw in invite generation, added expiresAt dynamically to InviteModal, and fixed EmptyState CTA visibility to respect conversation length.
- [Thursday 11 June 2026] Executed Invite Architecture Polish: Renamed targetId -> entityId globally, migrated DB, implemented consumed semantics to prevent over-bumping usedCount, and added a 24-hour active link rotation policy.
- [Thursday 11 June 2026] UI & Security Fixes: Prevented infinite loop in InviteModal, secured conversationResolver against 3+ member DM bug, and added a Postgres Database Trigger (trg_enforce_dm_member_limit) to strictly enforce maximum 2 members per DM.

## 11th June 2026 - Comprehensive Docs & Agents Update + Socket Documentation

- **Action**: Complete overhaul of all `.docs/` and `.agents/` documentation to reflect the current codebase state. Created comprehensive socket architecture documentation.
- **Details**:
  - Created `.docs/socket.md` — comprehensive socket event documentation with 12 sequence diagrams, event reference tables, room strategy, connection lifecycle, message flows (send/edit/delete/read), presence flow, conversation update flow, invite system socket events, dispatcher architecture, and middleware documentation.
  - Updated all 6 `public-docs/modules/*.md` files (chat, messages, conversations, auth, users, landing) with accurate architecture details, socket event references, file listings, and known issues.
  - Updated `public-docs/DOCUMENTATION.md` and `public-docs/file-structure.md` with socket layer, invites module, and accurate directory structure.
  - Updated `public-docs/data-flow.md` with all socket event flows and cross-references to `socket.md`.
  - Updated `.docs/architecture.md` with socket architecture section and invite system details.
  - Updated `.docs/context.md` with current socket event tables, invite system, and comprehensive API list.
  - Updated `.docs/data-flow.md` with comprehensive REST vs Socket split table, all data flow sections, and invite system flows.
  - Updated `.agents/01-project-context.md` with current socket event list, edit/delete status, and invite system.
  - Updated `.agents/03-database-schema.md` with Invite model, `latestMessageId` field, and updated edit/delete status.
  - Updated `.agents/04-phase-1-plan.md` to archived status with full Phase 1 retrospective and deferred debt.
  - Updated `.agents/05-agent-boundaries.md` with socket emission rules, dispatcher usage, and documentation requirements.
- **Files Touched**:
  - `.docs/socket.md` (NEW)
  - `.docs/public-docs/modules/chat.md`
  - `.docs/public-docs/modules/messages.md`
  - `.docs/public-docs/modules/conversations.md`
  - `.docs/public-docs/modules/auth.md`
  - `.docs/public-docs/modules/users.md`
  - `.docs/public-docs/modules/landing.md`
  - `.docs/public-docs/DOCUMENTATION.md`
  - `.docs/public-docs/file-structure.md`
  - `.docs/public-docs/data-flow.md`
  - `.docs/architecture.md`
  - `.docs/context.md`
  - `.docs/data-flow.md`
  - `.docs/incremental-logs.md`
  - `.agents/01-project-context.md`
  - `.agents/03-database-schema.md`
  - `.agents/04-phase-1-plan.md`
  - `.agents/05-agent-boundaries.md`

## 11th June 2026 — New Docs: Onboarding, Deployment, API Reference, State Management, Error Handling

- **Action**: Created 5 new documentation files covering the remaining documentation gaps.
- **Details**:
  - `.docs/onboarding.md` — Complete local dev setup guide: prerequisites, env vars for both client/server, database setup with Supabase + Prisma migrations, Redis options (Upstash or local Docker), running instructions, verification checklist, and common issues FAQ.
  - `.docs/deployment.md` — Render deployment architecture: two-service topology (nexus-server + nexus-client), `render.yaml` configuration, production env vars, build process, CORS config, WebSocket considerations, production migration strategy, and known limitations.
  - `.docs/api-reference.md` — Complete 13-endpoint REST API reference: every endpoint with method, route, auth, rate limiting, request/response shapes, validation schemas, error responses, socket events emitted, and an endpoint summary table.
  - `.docs/state-management.md` — Client state architecture: TanStack Query vs Zustand boundary, query key factory with all 4 keys, infinite query pattern, all 3 mutation patterns (socket send, REST edit/delete), socket cache integration diagram, all Zustand stores (chatStore + authStore), store reset pattern on logout.
  - `.docs/error-handling.md` — Four-layer error handling strategy: transport (Axios interceptor + socket middleware), HTTP API (Express error handler, Zod validation, rate limiter), Socket.io (callback errors, disconnect, auth), UI (toasts, optimistic rollback, AuthGate). All server and client error responses documented in tables.
- **Files Touched**:
  - `.docs/onboarding.md` (NEW)
  - `.docs/deployment.md` (NEW)
  - `.docs/api-reference.md` (NEW)
  - `.docs/state-management.md` (NEW)
  - `.docs/error-handling.md` (NEW)
  - `.docs/incremental-logs.md`

## 11th June 2026 — Deployment Docs Corrections (Actual Setup)

- **Action**: Updated deployment docs to reflect the actual production setup based on user feedback.
- **Details**:
  - `render.yaml` is **not used** — server is deployed as a manual web service via Render Dashboard
  - Client is deployed on **Vercel**, not Render
  - Redis is used as a **standard key-value service** with `REDIS_URL` (standard connection string, not Upstash REST)
  - Updated `.docs/deployment.md` with corrected topology diagram, setup steps for both Render and Vercel, Redis provider options table, CORS config, and known limitations
  - Updated `.docs/context.md` hosting info (Render + Vercel, not just Render) and Redis env var name
  - Updated `.docs/architecture.md` infrastructure section
  - Updated `.docs/onboarding.md` Redis common issue text
- **Files Touched**:
  - `.docs/deployment.md`
  - `.docs/context.md`
  - `.docs/architecture.md`
  - `.docs/onboarding.md`
  - `.docs/incremental-logs.md`

## 11th June 2026 — Critical Race Condition Fix & Technical Debt Resolution

- **Action**: Fixed the critical race condition in `deleteMessage` and resolved multiple technical debt items in the messages service.
- **Details**:
  - **Race condition fix** (`c7e0cfc`): `deleteMessage` now computes `nextLatestMessageId` inside `prisma.$transaction(async (tx) => { ... })` using `tx.message.findFirst` with `deletedAt: null` filter, eliminating the window where concurrent deletions could corrupt `Conversation.latestMessageId`.
  - **Soft-delete leakage fix**: Added `where: { deletedAt: null }` to `getMessages` query, preventing deleted messages from being returned to clients.
  - **Pagination ordering fix**: Switched `getMessages` ordering from `createdAt: "desc"` to `id: "desc"` (UUIDv7), ensuring monotonic-safe cursor-based pagination.
- **Files Touched**:
  - `server/src/modules/messages/messages.service.ts`

## 11th June 2026 — Emoji Picker Integration

- **Action**: Added emoji picker to the message input component.
- **Details**:
  - Integrated `emoji-picker-react` (v4.19.1) into `MessageInput.tsx`.
  - Added `Smile` icon button that opens a `Popover` containing the emoji picker.
  - Supports dark/light themes via `next-themes` (`Theme.DARK` / `Theme.LIGHT`).
  - Custom styling with CSS variables for compact display (`--epr-emoji-size`, `--epr-preview-height`, etc.).
  - Emoji inserts at cursor position; input retains focus after selection.
- **Files Touched**:
  - `client/src/modules/chat/components/MessageInput.tsx`
  - `client/package.json`
  - `client/package-lock.json`

## 11th June 2026 — Invite Links for DMs

- **Action**: Added invite link generation for DM conversations, integrated into the sidebar.
- **Details**:
  - Implemented `useInviteLink` hook to generate invite links via `POST /api/invites/generate`.
  - Added `InviteModal` component with copy-to-clipboard, expiration display, and loading/error states.
  - Added `useInviteModal` shared hook for managing invite modal state (type, entityId).
  - Integrated InviteModal into Sidebar via dropdown menu with "New Message" and "Invite Someone" options.
  - Backend `invites.controller.ts` dispatches socket events on invite resolution (`CONVERSATION_NEW`, `CONVERSATION_UPDATE`).
- **Files Touched**:
  - `client/src/modules/chat/components/InviteModal.tsx` (NEW)
  - `client/src/modules/chat/hooks/useInviteLink.ts` (NEW)
  - `client/src/shared/hooks/useInviteModal.ts` (NEW)
  - `client/src/modules/chat/components/Sidebar.tsx`
  - `client/src/modules/chat/api/invites.api.ts`
  - `server/src/modules/invites/invites.controller.ts`

## 11th June 2026 — Mobile UI Improvements & Accessibility

- **Action**: Fixed UI inconsistencies, improved mobile responsiveness, and enhanced accessibility.
- **Details**:
  - Added unread count badge to the mobile back button in `ActiveConversation.tsx` for better navigation context.
  - Dynamic textarea heights using `scrollHeight` with 140px max, resetting on send.
  - Mobile-friendly keyboard handling: Enter adds new line on mobile, sends on desktop.
  - Various UI inconsistency fixes and code deduplication refactors.
- **Files Touched**:
  - `client/src/modules/chat/components/ActiveConversation.tsx`
  - `client/src/modules/chat/components/MessageInput.tsx`
  - `client/src/modules/chat/components/Sidebar.tsx`
  - Multiple other UI component files

## 11th June 2026 — Branding Update

- **Action**: Updated the logo and favicon.
- **Details**:
  - Replaced default Next.js favicon with Nexus branding.
  - Updated logo assets.
- **Files Touched**:
  - `client/public/images/`
  - `client/src/app/favicon.ico`

## 11th June 2026 — Comprehensive Documentation Update

- **Action**: Comprehensive update of all docs/ logs and structure files to reflect June 11 codebase state.
- **Details**:
  - Updated `daily-logs.md` with June 11 entry covering all changes.
  - Updated `.docs/incremental-logs.md` with detailed per-feature entries.
  - Updated `.docs/progress.txt` with June 11 progress.
  - Updated `.docs/major-changes.md` with race condition fix and emoji picker.
  - Updated `.docs/TECHNICAL_DEBT.md` to mark 3 resolved items.
  - Updated `.docs/context.md` and `.docs/AS_IS_ARCHITECTURE.md` to reflect fixed items.
  - Updated `.docs/public-docs/modules/chat.md`, `messages.md`, `conversations.md`.
  - Updated `.agents/01-project-context.md`, `03-database-schema.md`, `04-phase-1-plan.md`, `05-agent-boundaries.md`.
- **Files Touched**:
  - `daily-logs.md`
  - `.docs/incremental-logs.md`
  - `.docs/progress.txt`
  - `.docs/major-changes.md`
  - `.docs/TECHNICAL_DEBT.md`
  - `.docs/context.md`
  - `.docs/AS_IS_ARCHITECTURE.md`
  - `.docs/public-docs/modules/chat.md`
  - `.docs/public-docs/modules/messages.md`
  - `.docs/public-docs/modules/conversations.md`
  - `.agents/01-project-context.md`
  - `.agents/03-database-schema.md`
  - `.agents/04-phase-1-plan.md`
  - `.agents/05-agent-boundaries.md`
