# Nexus File Structure

This document outlines the high-level file and directory structure of the Nexus project.

## Root Directory

- `.agents/` — Contains internal instructions and context for AI agents working on the repository. *Critical: See `05-agent-boundaries.md`*.
- `.docs/` — Contains internal developer documentation, architecture audits, and logs.
  - `socket.md` — **Complete socket event documentation with flow diagrams (MUST READ)**
  - `AS_IS_ARCHITECTURE.md` — The brutal truth of the system's actual data flow
  - `TECHNICAL_DEBT.md` — Mandatory reading before touching the codebase
  - `incremental-logs.md` — Detailed, day-to-day progress logs
  - `major-changes.md` — Log of significant architectural decisions and deviations
  - `context.md` — Project context overview
  - `data-flow.md` — Data flow documentation
  - `architecture.md` — System architecture overview
  - `public-docs/` — The main public-facing documentation for the project
    - `DOCUMENTATION.md` — Entry point to all public docs
    - `data-flow.md` — Application data flow with Mermaid diagrams
    - `file-structure.md` — This file
    - `modules/` — Per-module documentation
- `client/` — The React/Next.js 16 frontend application
- `server/` — The Node.js/Express backend API

## Client Directory (`client/`)

- `src/`
  - `app/` — Next.js App Router (layouts, pages, route groups)
    - `(auth)/` — Auth pages layout (login, register, forgot-password)
    - `(protected)/` — Protected app layout (conversations)
    - `auth/callback/` — OAuth callback handler
    - `invite/` — Invite resolution page
  - `config/` — Environment configuration
  - `modules/` — Feature-based modules encapsulating UI components, hooks, and local state
    - `auth/` — Authentication flows (login, register, session management)
    - `chat/` — Chat UI, message rendering, typing indicators, presence, invite modal
    - `landing/` — Landing page components
    - `users/` — User profiles, search, and presence
  - `shared/` — Shared components (ui/*), providers (AuthGate, SocketProvider, QueryProvider, ThemeProvider), lib utilities
  - `proxy.ts` — Next.js Edge Middleware for route protection
- `package.json` — Frontend dependencies and scripts

## Server Directory (`server/`)

- `src/`
  - `config/` — Environment configuration (`env.ts`)
  - `lib/` — Database client (`db.ts`), Redis client (`redis.ts`)
  - `middlewares/` — Express middlewares (auth, errorHandler, rateLimiter, requireConversationMember, validate)
  - `modules/` — Feature-based backend modules (controllers, routes, services)
    - `conversations/` — Logic for managing DMs and group conversations
    - `messages/` — Logic for sending, editing, deleting, and querying messages
    - `users/` — User data management
    - `invites/` — Invite link generation, resolution, and domain event dispatching
  - `socket/` — Socket.io infrastructure
    - `socket.ts` — Server initialization, auth, room joining
    - `socket.dispatcher.ts` — Typed dispatch helpers for all socket events
    - `presenceStore.ts` — Redis + in-memory presence store
    - `socketErrors.ts` — Error code constants
    - `handlers/` — Event handlers (`message.handler.ts`, `presence.handler.ts`)
    - `middlewares/` — Socket middlewares (`auth.ts`, `rateLimiter.ts`)
  - `shared/` — Shared constants (`socket-events.ts`)
  - `types/` — TypeScript type definitions (`shared.ts`)
  - `utils/` — Utility functions (`jwt.ts`)
  - `app.ts` — Express app configuration
  - `server.ts` — HTTP server + Socket.io initialization
- `prisma/` — Prisma schema, migrations, seed scripts
- `package.json` — Backend dependencies and scripts

*(Note: For more granular details about specific modules, refer to the `modules/` folder in `public-docs`.)*
