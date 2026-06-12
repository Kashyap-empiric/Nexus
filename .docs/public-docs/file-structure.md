# Nexus File Structure

This document outlines the high-level file and directory structure of the Nexus project.

## Root Directory

- `.agents/` — Internal instructions and context for AI agents working on the repository.
- `.docs/` — Internal developer documentation, architecture audits, and logs.
  - `UUX_AUDIT_REPORT.md` — Comprehensive UI/UX audit report
  - `FRONTEND_REFACTORING_ANALYSIS.md` — Frontend restructuring documentation
  - `public-docs/` — Public-facing project documentation
    - `DOCUMENTATION.md` — Entry point to all public docs
    - `data-flow.md` — Application data flow with Mermaid diagrams
    - `file-structure.md` — This file
    - `modules/` — Per-module documentation
      - `auth.md` — Authentication module
      - `chat.md` — Chat orchestrator module
      - `conversations.md` — Conversations module (DM + Channels)
      - `messages.md` — Messages module
      - `workspaces.md` — Workspaces module
      - `users.md` — Users module
      - `landing.md` — Landing page module
- `PLAN.md` — Implementation plan for remaining workspace features
- `client/` — React/Next.js 16 frontend application
- `server/` — Node.js/Express backend API

## Client Directory (`client/`)

- `src/`
  - `app/` — Next.js App Router (layouts, pages, route groups)
    - `(auth)/` — Auth pages (login, register, forgot-password)
    - `(protected)/` — Protected app layout with AppLayoutShell
      - `conversations/` — DM conversation routes
      - `workspaces/[slug]/channels/` — Workspace channel routes
    - `auth/callback/` — OAuth callback handler
    - `invite/` — Invite resolution page
  - `config/` — Environment configuration
  - `modules/` — Feature-based modules
    - `auth/` — Authentication flows
    - `chat/` — Chat orchestrator (ActiveConversation, NavigationRail, PresenceIndicator, hooks, store)
    - `workspaces/` — Workspace & channel management
    - `conversations/` — DM/conversation UI (Sidebar, NewConversationModal, EmptyState)
    - `messages/` — Message components (MessageList, MessageGroupItem, MessageInput, MessageStatus)
    - `invites/` — Invite link generation and resolution
    - `users/` — User profiles and search
    - `landing/` — Landing page components
  - `socket/` — Socket.io client infrastructure (provider, store, events, handlers)
  - `shared/` — Shared components (ui/*), providers, lib utilities, constants
  - `proxy.ts` — Next.js Edge Middleware for route protection

## Server Directory (`server/`)

- `src/`
  - `config/` — Environment configuration (`env.ts`)
  - `lib/` — Database client (`db.ts`), Redis client (`redis.ts`), transaction helper
  - `middlewares/` — Express middlewares (auth, errorHandler, rateLimiter, requireConversationMember, validate)
  - `modules/` — Feature-based backend modules
    - `workspaces/` — Workspace CRUD, channel management, membership
    - `conversations/` — DM management, read receipts
    - `messages/` — Message CRUD, pagination, soft-delete
    - `users/` — User data
    - `invites/` — Invite generation, resolution, domain events
    - `auth/` — Auth service (`auth.service.ts`) and repository (`auth.repository.ts`)
  - `socket/` — Socket.io infrastructure
    - `socket.ts` — Server initialization, auth, room joining
    - `socket.dispatcher.ts` — Typed dispatch helpers for all socket events
    - `socket.types.ts` — Type definitions
    - `socketErrors.ts` — Error code constants
    - `presenceStore.ts` — Redis + in-memory presence store
    - `handlers/` — Event handlers (message.handler, presence.handler, workspace.handler)
    - `middlewares/` — Socket middlewares (auth, rateLimiter)
  - `shared/` — Shared constants (`socket-events.ts`, `permissions.ts`)
  - `types/` — TypeScript type definitions (`shared.ts`)
  - `utils/` — Utility functions (`jwt.ts`)
  - `app.ts` — Express app configuration, route registration
  - `server.ts` — HTTP server + Socket.io initialization
- `prisma/` — Prisma schema, migrations, seed scripts
  - `seed.ts` — Database seed script
  - `schema.prisma` — Full database schema
  - `migrations/` — Migration history
  - `prisma.config.ts` — Prisma configuration
  - `tsup.config.ts` — Build configuration
- `scripts/` — Utility scripts (`backfill-slugs.ts`)
- `package.json` — Backend dependencies and scripts (`dev`, `build`, `start`)
- `tsconfig.json` — TypeScript configuration
