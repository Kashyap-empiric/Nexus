# Nexus File Structure

This document outlines the high-level file and directory structure of the Nexus project.

## Root Directory

- `.agents/` - Contains internal instructions and context for AI agents working on the repository. *Critical: See `05-agent-boundaries.md`*.
- `.docs/` - Contains internal developer documentation, architecture audits, and logs.
  - `AS_IS_ARCHITECTURE.md` - The brutal truth of the system's actual data flow.
  - `TECHNICAL_DEBT.md` - Mandatory reading before touching the codebase.
  - `incremental-logs.md` - Detailed, day-to-day progress logs.
  - `major-changes.md` - Log of significant architectural decisions and deviations.
- `public-docs/` - The main public-facing documentation for the project.
- `client/` - The React/Next.js frontend application.
- `server/` - The Node.js/Express backend API.

## Client Directory (`client/`)

- `src/`
  - `modules/` - Feature-based modules encapsulating UI components, hooks, and local state.
    - `auth/` - Authentication flows (login, register, session management).
    - `chat/` - Chat UI, message rendering, and typing indicators.
    - `landing/` - Landing page components.
    - `users/` - User profiles and settings.
  - `shared/` - Shared components, providers (e.g., `AuthGate.tsx`), and utilities.
- `package.json` - Frontend dependencies and scripts.

## Server Directory (`server/`)

- `src/`
  - `modules/` - Feature-based backend modules (controllers, routes, services).
    - `conversations/` - Logic for managing direct and group chats.
    - `messages/` - Logic for sending, receiving, and querying messages.
    - `users/` - User data management and authentication endpoints.
  - `config/` - Environment and database configurations.
- `package.json` - Backend dependencies and scripts.

*(Note: For more granular details about specific modules, refer to the `modules/` folder in `public-docs`.)*
