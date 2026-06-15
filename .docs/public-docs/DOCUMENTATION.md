# Nexus Documentation

Welcome to the main documentation for the Nexus project. This directory (`public-docs/`) contains all the necessary architectural overviews, module descriptions, and file structure definitions needed to understand the application.

## Overview

Nexus is a full-stack communication platform consisting of a Node.js backend (`server/`) and a Next.js 16 frontend (`client/`). The system is organized into feature-based modules, each containing UI components (client) and business logic/API routes (server).

Real-time communication is handled via **Socket.io** with a comprehensive event system.

## Key Resources

- **[File Structure](./file-structure.md)**: High-level view of the repository's directory layout.
- **[Data Flow](./data-flow.md)**: REST and WebSocket data flow diagrams.
- **[Client & Server Modules](./modules/)**: Documentation for each domain module.

## Modules Summary

The application is broken down into specific domains. Each domain has a representation on both the client and the server:

1. **Auth**: User authentication via Supabase Auth + Prisma DB Triggers. Client routes protected by Next.js Edge Middleware. Server routes protected by local ES256 JWKS verification.

2. **Chat / Messages**: Core communication feature. Message delivery via Socket.io (`message:send` → `message:new`) and REST fallback. Features optimistic UI, TanStack Query cache updates, message grouping, editing, and soft-deletion with real-time broadcast. Markdown rendering via `react-markdown` + `remark-gfm`.

3. **Conversations**: Containers for messages — supports DMs (`type: DM`, `dmPair` deduplication) and workspace channels (`type: CHANNEL`, `workspaceId` FK). Features read receipts and `CONVERSATION_UPDATE` socket events for sidebar previews.

4. **Workspaces**: Team collaboration spaces with channels, membership, and roles (OWNER/ADMIN/MEMBER). Channel creation, workspace switching via NavigationRail, slug-based routing (`/workspaces/{slug}/channels/{channelId}`). Batch invite support, member removal.

5. **Users**: User profiles, search/discovery, presence status, and profile editing (`GET/PATCH /users/me` for username, displayName, avatarUrl). Presence backed by Upstash Redis + in-memory dual-write with `user:online`/`user:offline`/`presence:initial` socket events.

6. **Invites**: Secure deep-linked invite system supporting USER, CONVERSATION, WORKSPACE, and CHANNEL invite types. Features 24-hour active link rotation, atomic consumption via raw SQL, domain event dispatching, and batch invite for multiple users.

7. **Notifications**: Full in-app notification system with bell popover, unread badges, notifications page with infinite scroll, and real-time socket delivery (`notification:new`). Types: INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, MEMBER_REMOVED.

8. **Push Notifications**: Web Push API via VAPID keys and `web-push` library. Service Worker handles push events and `notificationclick` navigation. Subscription management via REST API with rate limiting.

9. **Settings**: Tabbed settings modal (Profile, Appearance, Notifications). Profile editing with React Hook Form + Zod validation. Appearance settings (theme toggle). Notification preferences stored server-side on User model.

10. **Socket Layer**: Socket.io infrastructure — connection lifecycle, room management, auth middleware, rate limiting, and typed dispatcher architecture.

For detailed information on each module, see the respective markdown files inside the `public-docs/modules/` directory.
