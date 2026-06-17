# Nexus — High-Level Codebase Overview

> **A real-time messaging platform** (Slack-clone) built as a full-stack TypeScript monorepo.

---

## 1. What is Nexus?

Nexus is a real-time communication platform that supports **workspaces, channels, direct messages (DMs), in-app notifications, web push notifications, presence tracking, invited-based access, and message pinning**. It is structured as two independent applications — a **Next.js client** and an **Express.js server** — that communicate over HTTP (REST) and WebSockets (Socket.io).

---

## 2. Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16 + React 19 | UI framework, routing |
| **Styling** | Tailwind CSS v4 + shadcn/ui + Lucide icons | Component UI system |
| **Server State** | TanStack Query v5 | Caching, pagination, optimistic updates |
| **Client State** | Zustand | Socket status, online users, typing users |
| **Forms** | react-hook-form + zod | Form validation |
| **Backend** | Express.js 5 | REST API server |
| **Real-time** | Socket.io 4 | Bidirectional WebSocket events |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Prisma 7 | Database access, migrations |
| **Cache** | Redis (Upstash) | Presence tracking, last-seen timestamps |
| **Auth** | Supabase Auth + local JWKS/JWT | Authentication |
| **Push** | Web Push API (VAPID) | Browser push notifications |
| **Package Manager** | pnpm (root) / npm (apps) | Dependency management |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client (Next.js 16)                          │
│                                                                      │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│   │ App Router  │   │   Modules    │   │    Socket.io Client       │  │
│   │   (pages)   │   │  (features)  │   │  (eventRouter + handlers) │  │
│   └─────────────┘   └──────────────┘   └──────────────────────────┘  │
│         │                  │                       │                  │
│         ▼                  ▼                       ▼                  │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │     TanStack Query (server state)  +  Zustand (UI state)     │   │
│   └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP (Axios)  /  WS (Socket.io)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Server (Express.js)                          │
│                                                                      │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│   │   Routes    │   │ Controllers  │   │    Socket.io Server       │  │
│   │   (REST)    │   │  + Services  │   │  (handlers + dispatcher)  │  │
│   └─────────────┘   └──────────────┘   └──────────────────────────┘  │
│         │                  │                       │                  │
│         ▼                  ▼                       ▼                  │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  Middleware: auth (JWKS-based) / rateLimiter / zod validation │   │
│   └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                     ┌───────────┴────────────┐
                     ▼                        ▼
              ┌────────────┐          ┌──────────────┐
              │ PostgreSQL │          │    Redis     │
              │  (Prisma)  │          │  (Presence)  │
              └────────────┘          └──────────────┘
```

### Communication Flows

**REST API Flow** (CRUD operations):
```
Client (TanStack Query) → Axios → Express Route → Controller → Service → Repository → Prisma → PostgreSQL
                                                                                        │
                                                                               socket.dispatcher
                                                                                        │
                                                                                 Socket.io broadcast
```

**Real-Time Flow** (messages, presence, notifications):
```
Client A (Socket.io) → emit → Server Handler → Prisma → socket.dispatcher → Client B
                         │                                                     │
                    callback({success, data})                         update TanStack cache
```

**Presence Flow** (online/offline tracking):
```
Client connects → Server auth middleware → PresenceStore.addSocket(userId, socketId)
    → Redis SADD → is first connection? → broadcast "user:online" → other clients
```

---

## 4. Project Structure

```
nexus/
├── client/                          # Next.js frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── (auth)/              # Login, register, forgot password
│   │   │   ├── (protected)/         # Authenticated routes
│   │   │   │   ├── conversations/   # DM views
│   │   │   │   ├── workspaces/      # Workspace + channel views
│   │   │   │   ├── settings/        # User settings
│   │   │   │   ├── notifications/   # Full notification page
│   │   │   │   └── onboarding/      # New user onboarding wizard
│   │   │   └── invite/              # Invite link resolver
│   │   ├── modules/                 # Feature modules
│   │   │   ├── auth/                # Auth store, hooks, forms
│   │   │   ├── chat/                # Orchestrator: ActiveConversation, InfoPanel
│   │   │   ├── conversations/       # Sidebar, DM management
│   │   │   ├── messages/            # MessageList, MessageInput, search, pins
│   │   │   ├── workspaces/          # Workspace CRUD, channels, members
│   │   │   ├── notifications/       # Bell popover, settings, push
│   │   │   ├── invites/             # Generate/resolve invites
│   │   │   ├── settings/            # Profile, appearance, about
│   │   │   ├── users/               # Profiles, search, status
│   │   │   ├── onboarding/          # Multi-step wizard
│   │   │   └── landing/             # Public landing page
│   │   ├── socket/                  # Socket.io client
│   │   ├── shared/                  # UI components, hooks, utilities
│   │   └── config/                  # Client env config, URL constants
│   ├── next.config.ts
│   └── package.json
│
├── server/                          # Express.js backend
│   ├── src/
│   │   ├── server.ts                # Entry point: HTTP + Socket.io bootstrap
│   │   ├── app.ts                   # Express app setup: routes, middleware
│   │   ├── modules/                 # Feature modules
│   │   │   ├── auth/                # Auth service, Supabase token verification
│   │   │   ├── workspaces/          # Workspace & channel CRUD, membership
│   │   │   ├── conversations/       # DM management, read receipts
│   │   │   ├── messages/            # Message CRUD, pagination, soft-delete, pins
│   │   │   ├── users/               # User profiles, search
│   │   │   ├── invites/             # Invite generation, resolution, resolvers
│   │   │   ├── notifications/       # CRUD, push subscriptions, preferences
│   │   │   ├── onboarding/          # Onboarding completion
│   │   │   └── channels/            # Channel access helpers
│   │   ├── socket/                  # Socket.io server
│   │   │   ├── socket.ts            # Server + connection handler
│   │   │   ├── socket.dispatcher.ts # Centralized event emission
│   │   │   ├── presenceStore.ts     # Redis + in-memory presence
│   │   │   ├── handlers/            # Per-feature socket handlers
│   │   │   └── middlewares/         # Auth, rate limiting
│   │   ├── middlewares/             # Express middlewares: auth, rateLimit, validation
│   │   ├── lib/                     # Prisma client, Redis client, transaction helpers
│   │   ├── services/                # Push notification service (web-push)
│   │   ├── config/                  # Server env config
│   │   └── shared/                  # Permissions, socket event constants
│   └── prisma/
│       ├── schema.prisma            # Database schema (all models, enums)
│       └── migrations/              # SQL migration files
│
├── .docs/                           # Documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API_REFERENCE.md
│   ├── FEATURES.md
│   ├── PROJECT_CONTEXT.md
│   ├── CHANGELOG.md
│   ├── LIMITATIONS.md
│   └── ENVIRONMENT_VARIABLES.md
│
├── .agents/                         # Agent system instructions
├── render.yaml                      # Render deployment blueprint
└── pnpm-workspace.yaml
```

---

## 5. Server Architecture

### Module Pattern (REST)

Every server module follows a **layered architecture**:

```
routes.ts      →  HTTP route definitions + Zod validation schemas
controller.ts  →  Request handling, response formatting, error mapping
service.ts     →  Business logic, authorization, orchestrates repositories
repository.ts  →  Prisma queries (data access layer)
types.ts       →  TypeScript interfaces
schema.ts      →  Zod validation schemas
```

Example: `modules/workspaces/`
- `workspaces.routes.ts` — Defines `GET /api/workspaces`, `POST /api/workspaces`, etc.
- `workspaces.controller.ts` — Parses request params, calls service, sends response
- `workspaces.service.ts` — Contains permissions logic, channel auto-join, slug uniqueness
- `workspaces.repository.ts` — Prisma queries for workspace and channel CRUD
- `workspaces.schema.ts` — Zod schemas for request validation
- `workspaces.types.ts` — Shared TypeScript types

### Socket Server Architecture

```
socket.ts                  → Creates Socket.io server, auth middleware, room joining
socket.dispatcher.ts       → Centralized module that emits events (the ONLY emission path)
presenceStore.ts           → Dual-write (Redis + in-memory) presence tracker
handlers/
├── message.handler.ts     → message:send event → save to DB + dispatch
├── workspace.handler.ts   → workspace:join event
└── presence.handler.ts    → connect/disconnect → update presence + broadcast
```

**Key design pattern:** The `socket.dispatcher` is the **only code path** that emits Socket.io events. Controllers and services call dispatcher functions; they never import `io` directly.

### REST API Endpoints

| Group | Key Endpoints |
|-------|--------------|
| **Auth** | `GET /api/me` |
| **Conversations** | `GET/POST /api/conversations`, `GET /api/conversations/:id`, `PATCH .../read` |
| **Messages** | `GET/POST /api/conversations/:id/messages`, `PATCH/DELETE .../messages/:id`, `GET /api/messages/search` |
| **Messages (Pins)** | `POST/DELETE /api/conversations/:id/pins/:messageId`, `GET .../pins` |
| **Workspaces** | `GET/POST /api/workspaces`, `GET/PATCH/DELETE /api/workspaces/:id` |
| **Channels** | `GET/POST /api/workspaces/:id/channels`, `PATCH/DELETE .../channels/:channelId` |
| **Members** | `GET /api/workspaces/:id/members`, role management, channel membership |
| **Users** | `GET /api/users`, `GET/PATCH /api/users/me`, user search |
| **Invites** | `POST /api/invites/generate`, `POST .../resolve`, batch invite |
| **Notifications** | `GET /api/notifications`, unread count, push subscribe, preferences |

### Socket.io Events

**Client → Server:**
| Event | Purpose |
|-------|---------|
| `message:send` | Send a message with optimistic tempId |
| `workspace:join` | Join workspace room |
| `typing:start` / `typing:stop` | Typing indicators |

**Server → Client:**
| Event | Purpose |
|-------|---------|
| `message:new` / `message:update` / `message:delete` | Real-time message sync |
| `message:read` | Read receipt broadcast |
| `message:pin` / `message:unpin` | Pin state changes |
| `conversation:new` / `conversation:update` | Conversation list updates |
| `channel:update` / `channel:member-added` / `channel:member-removed` | Channel changes |
| `workspace:update` / `member:update` | Workspace/metadata changes |
| `user:online` / `user:offline` / `presence:initial` | Presence tracking |
| `user:status:update` / `user:update` | Profile/status changes |
| `notification:new` | Real-time notification delivery |
| `typing:start` / `typing:stop` | Typing indicators |

---

## 6. Client Architecture

### Application Shell

```
AppLayoutShell
├── NavigationRail (leftmost — workspace switcher, settings)
├── Sidebar (conversation list / workspace channels)
├── Main Content Area
│   ├── Header (breadcrumb, search, bell, info toggle)
│   └── Content (ActiveConversation or workspace landing)
└── InfoPanel (right panel — about, members, pins)
```

### Client-State Management

- **TanStack Query (server state):** All API data (conversations, messages, users, workspaces, notifications) is managed via `useQuery`/`useMutation` with automatic cache invalidation.
- **Zustand (UI state):** Socket connection status, online users set, typing indicators, active conversation header info.
- **Socket event router:** Handlers receive Socket.io events and perform targeted TanStack cache updates (optimistic) to avoid full refetches.

### Client Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `auth` | Supabase session management, login/register forms, auth store |
| `chat` | Orchestrator component (`ActiveConversation`), socket hooks, header state |
| `conversations` | Sidebar, DM list, conversation creation modal, channel settings modal |
| `messages` | Message list with infinite scroll, message input (Tiptap editor), search, pinned messages |
| `workspaces` | Workspace CRUD, channel management, member management, member lists |
| `settings` | User profile editing, appearance/theme, notification preferences, about page |
| `users` | User profiles, user search, status selector |
| `notifications` | Bell popover, notification list, push subscription, preferences |
| `invites` | Invite modal, invite link generation/resolution |
| `onboarding` | Multi-step onboarding wizard (profile → workspace) |
| `landing` | Public landing page (for unauthenticated users) |

### Key Client Technologies

- **Rendering:** Markdown messages are rendered via `react-markdown` with `remark-gfm` (tables, strikethrough, task lists) and `rehype-highlight` (code syntax highlighting).
- **Message Input:** Built with **Tiptap** (ProseMirror-based editor) with markdown support and an emoji picker.
- **Modals:** A `Dialog` component (Base UI / shadcn) is used for all modals — settings, invite, channel creation, etc.
- **Toasts:** `sonner` library for toast notifications.

---

## 7. Database Schema (Key Models)

```
User ────< WorkspaceMember >──── Workspace
 │                                    │
 │                              (workspaceId on Conversation)
 │                                    │
 ├──< ConversationMember >──── Conversation (type: DM | CHANNEL)
 │                                    │
 └──< Message                    (conversationId on Message)
         │                             │
         ├── PinnedMessage             │
         └── (self-referential replyToId)
```

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | id, email, username, avatarUrl, status | Synced from Supabase Auth |
| **Workspace** | id, name, slug (unique), ownerId | Slug-based URL routing |
| **WorkspaceMember** | workspaceId, userId, role (OWNER/ADMIN/MEMBER) | Composite PK |
| **Conversation** | id, type (DM/CHANNEL), name, workspaceId, visibility, dmPair | DMs use dmPair for dedup |
| **ConversationMember** | conversationId, userId, lastReadMessageId | Read receipts |
| **Message** | id, content, conversationId, userId, deletedAt, replyToId | Cursor pagination on (conversationId, id) |
| **PinnedMessage** | messageId, conversationId, pinnedBy | One pin per message |
| **Invite** | id, type, token, maxUses, expiresAt | Token-based secure invites |
| **Notification** | id, userId, type, title, body, link, read | Indexed on (userId, read, createdAt) |
| **PushSubscription** | userId, endpoint, p256dh, auth | VAPID-based push |

--- 

## 8. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Channels reuse Conversation model** | All existing message infrastructure works without modification. A channel is simply a Conversation with `type: CHANNEL`. |
| **UUIDv7 for all IDs** | Time-ordered for efficient cursor pagination. Generated in the app layer using the `uuidv7` npm package. |
| **Local JWKS verification** | Zero network calls for auth on each request. JWKS is cached on server start. |
| **Dual-write presence (Redis + in-memory)** | Redis for production scale; in-memory fallback for offline development and resilience. |
| **Socket dispatcher pattern** | Controllers never import Socket.io directly — the dispatcher is the single emission path. |
| **Slug-based workspace routing** | Human-readable URLs: `/workspaces/{slug}/channels/{id}`. |
| **Auto-join on channel creation** | All workspace members are automatically added to new public channels. |
| **Soft deletes for messages** | Messages use `deletedAt` rather than hard deletion. All queries filter `deletedAt: null`. |

---

## 9. Key Features

- **Direct Messages:** Idempotent creation via `dmPair` (sorted user IDs). Read receipts with single/double checkmarks.
- **Workspaces:** Full CRUD with roles (OWNER, ADMIN, MEMBER). Slug-based routing. Icon upload via Supabase Storage.
- **Channels:** Public (auto-join for all members) and Private (invite-only). Rename, change visibility, member management.
- **Real-Time Messaging:** Optimistic sends via Socket.io with TanStack cache updates. Edit, delete, pin/unpin in real-time.
- **Presence:** Tracks online/offline across multiple tabs. Redis-backed with in-memory fallback.
- **Notifications:** In-app bell with unread badges + Web Push (VAPID) via service worker.
- **Invites:** Token-based invite system supporting four entity types (user, conversation, workspace, channel). Batch invites.
- **Message Search:** Full-text search across all messages the user has access to.
- **Message Pins:** Pin/unpin messages to conversations. Dedicated pinned messages panel.
- **User Profiles:** Avatar upload (Supabase Storage), status (AVAILABLE/AWAY/DND/INVISIBLE), bio, display name.
- **Appearance:** Dark/light/system theme via `next-themes`.
- **Onboarding:** Multi-step wizard for new users (profile setup → workspace creation).
- **Rate Limiting:** Configurable rate limits on REST endpoints, socket events, and push notifications.

---

## 10. Development Setup

```bash
# Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account

# Install dependencies
cd client && npm install
cd server && npm install

# Set up environment variables (see .docs/ENVIRONMENT_VARIABLES.md)

# Run database migrations
cd server && npx prisma migrate dev

# Start both servers (in separate terminals)
cd server && npm run dev    # Express on port 4000
cd client && npm run dev    # Next.js on port 3001
```
