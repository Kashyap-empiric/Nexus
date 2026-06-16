# Nexus — Architecture Guide

> **Last Updated:** 2026-06-16  
> **Purpose:** Architectural overview, data flow, and communication patterns.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Next.js 16)                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐  │
│  │ App      │  │ Modules   │  │ Socket.io Client         │  │
│  │ Router   │  │ (feature) │  │ (eventRouter + handlers) │  │
│  └──────────┘  └───────────┘  └──────────────────────────┘  │
│        │              │                     │                │
│        ▼              ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TanStack Query (server state) + Zustand (UI state) │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTP (Axios) / WS (Socket.io)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express.js)                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐  │
│  │ Routes   │  │ Controllers│  │ Socket.io Server         │  │
│  │ (REST)   │  │ + Services │  │ (handlers + dispatcher)  │  │
│  └──────────┘  └───────────┘  └──────────────────────────┘  │
│        │              │                     │                │
│        ▼              ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Middleware: auth (JWKS) / rateLimiter / validation  │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌──────────┐          ┌──────────────┐
│PostgreSQL│          │Upstash Redis │
│ (Prisma) │          │  (Presence)  │
└──────────┘          └──────────────┘
```

---

## 2. Module Architecture

### Client Module Structure
```
client/src/modules/
├── auth/          # Login, register, OAuth, session management
├── chat/          # Orchestrator: ActiveConversation, store, socket hooks
├── conversations/ # Sidebar, conversation list, DM management
├── invites/       # Invite link generation, resolution
├── landing/       # Public landing page
├── messages/      # Message list, input, rendering, attachments
├── notifications/ # Bell, settings, push, in-app notifications
├── settings/      # Profile, appearance, notification preferences
├── users/         # User profiles, search, status
└── workspaces/    # Workspace CRUD, channels, members, roles
```

### Server Module Structure
```
server/src/modules/
├── workspaces/    # Workspace CRUD, channel management, membership
├── conversations/ # DM management, read receipts
├── messages/      # Message CRUD, pagination, soft-delete
├── users/         # User data, profile management, search
├── invites/       # Invite generation, resolution, domain events
├── notifications/ # Notification CRUD, push subs, preferences
└── auth/          # Auth service, repository
```

### Socket Infrastructure
```
client/src/socket/           server/src/socket/
├── socketClient.ts          ├── socket.ts
├── socketProvider.tsx       ├── socket.dispatcher.ts
├── socketStore.ts           ├── socket.types.ts
├── eventRouter.ts           ├── socketErrors.ts
├── socket-events.ts         ├── presenceStore.ts
├── useSocketEvent.ts        ├── handlers/
└── handlers/                └── middlewares/
```

---

## 3. Communication Patterns

### REST API Flow
```
Client (TanStack Query) → Axios → Express Route → Controller → Service → Repository → Prisma → PostgreSQL
                                                                                             │
                                                                                    socket.dispatcher
                                                                                             │
                                                                                      Socket.io broadcast
```

### Real-Time Flow
```
Client A (Socket.io) → emit → Server Handler → Prisma (transaction) → socket.dispatcher → Client B
                          │                                                                    │
                     callback({success, data})                                        update TanStack cache
```

### Presence Flow
```
Client connects → Server auth middleware → PresenceStore.addSocket(userId, socketId)
    → Redis SADD → is first connection? → broadcast "user:online" → other clients
```

---

## 4. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Channels reuse Conversation model | All existing message infrastructure works without modification |
| UUIDv7 for all IDs | Time-ordered for cursor pagination. Generated in app layer. |
| Local JWKS verification | Zero network calls on each request. Cached on server start. |
| Dual-write presence | Redis + in-memory Map for resilience and offline development |
| Socket dispatcher pattern | Controllers do NOT import socket.io — dispatcher is the only emission path |
| Slug-based workspace routing | Human-readable URLs: `/workspaces/{slug}/channels/{id}` |
| Auto-join on channel creation | All workspace members auto-added to new public channels |
