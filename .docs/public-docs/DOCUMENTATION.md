# Nexus Documentation

Welcome to the main documentation for the Nexus project. This directory (`public-docs/`) contains all the necessary architectural overviews, module descriptions, and file structure definitions needed to understand the application.

> **CRITICAL**: The Nexus backend architecture has undergone a massive Phase 1 Forensic Audit. Ensure you read `.docs/AS_IS_ARCHITECTURE.md` and `.docs/TECHNICAL_DEBT.md` before attempting any new features or assuming system behavior. For socket-specific details, see `.docs/socket.md`.

## Overview

Nexus is a full-stack communication platform consisting of a Node.js backend (`server/`) and a Next.js 16 frontend (`client/`). The system relies heavily on a modular architecture where each feature is compartmentalized into its own module containing both the UI elements (on the client) and the business logic/API routes (on the server).

Real-time communication is handled via **Socket.io** with a comprehensive event system documented in `.docs/socket.md`.

## Key Resources

- **[AS-IS Architecture](../AS_IS_ARCHITECTURE.md)**: The brutally honest breakdown of the current data flows and technical realities.
- **[Technical Debt](../TECHNICAL_DEBT.md)**: Mandatory reading to prevent data corruption via race conditions and non-transactional reads.
- **[Socket Architecture](../socket.md)**: Complete documentation of all socket events, flows, room strategy, and presence system.
- **[File Structure](./file-structure.md)**: A high-level view of the repository's directory layout.
- **[Data Flow](./data-flow.md)**: REST and WebSocket data flow diagrams.
- **[Client & Server Modules](./modules/)**: Documentation outlining specific domains like Auth, Chat, Conversations, and Users.

## Modules Summary

The application is broken down into specific domains. Each domain generally has a representation on both the client and the server:

1. **Auth**: Handles user authentication, registration, login, and session persistence via Supabase Auth + Prisma DB Triggers. Client routes protected by Next.js Edge Middleware. Server routes protected by local ES256 JWKS verification.

2. **Chat / Messages**: The core communication feature. Message delivery via both Socket.io (`message:send` → `message:new`) and REST fallback (`POST /messages`). Features optimistic UI with `tempId` swapping, TanStack Query cache updates, dynamic browser tab unread badges, and message grouping. Supports message editing and soft-deletion with real-time broadcast.

3. **Conversations**: Manages the containers for messages (DMs). Features `dmPair` deduplication strategy, `CONVERSATION_UPDATE` decoupling for sidebar previews, and `message:read` broadcast for real-time read receipts.

4. **Users**: Manages user profiles, search/discovery, and presence status. Presence is backed by Upstash Redis + in-memory dual-write, with `user:online` / `user:offline` / `presence:initial` socket events driving the `PresenceIndicator` UI component.

5. **Socket Layer**: The Socket.io infrastructure spanning server and client — connection lifecycle, room management, auth middleware, rate limiting, and the dispatcher architecture. See `.docs/socket.md` for complete details.

6. **Invites**: Secure deep-linked invite system supporting USER and CONVERSATION invite types. Features 24-hour active link rotation policy, atomic consumption via raw SQL, and domain event dispatching for real-time notifications.

For detailed information on each module, please view the respective markdown files inside the `public-docs/modules/` directory.
