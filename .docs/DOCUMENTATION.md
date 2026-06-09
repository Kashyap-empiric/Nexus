# Nexus: Master Project Documentation

> **Status:** Active Development (Phase 1 core features complete)
> **Last Updated:** 2026-06-09

Welcome to the comprehensive master documentation for **Nexus**, a real-time messaging and collaboration platform designed as a scalable Slack-style application.

This document serves as the single-source-of-truth for project goals, architecture, database schema, data flows, and technical stack decisions.

---

## 1. Executive Summary

Nexus is a full-stack TypeScript monorepo built to deliver instant communication and team collaboration. 

The project is structured in phases to ensure a stable foundation:
- **Phase 1 (Complete):** Core messaging foundation. Includes robust user authentication, direct 1-on-1 messaging, cursor-based message pagination, real-time message delivery via WebSockets, read receipts, and user presence tracking (Redis-backed with in-memory fallback). 🟡 Message editing (`editMessage` service) and soft-delete (`deletedAt` schema field + migration) infrastructure exists but REST endpoints are not yet exposed.
- **Phase 2 (Upcoming):** Team collaboration extensions. Includes Workspaces, public/private channels, RBAC (Role-Based Access Control), emoji reactions, and rich text formatting.
- **Phase 3 (Planned):** Advanced features. File uploads (S3/Supabase Storage), full-text search, WebRTC voice/video calls, and background jobs.

---

## 2. Features Breakdown (Phase 1)

| Feature | Description | Status |
|---|---|---|
| **User Authentication** | Email/password registration and login via Supabase Auth. Seamless integration with Express server via local JWKS signature verification. | ✅ Implemented |
| **Protected Routes** | Next.js Edge Middleware for UI protection; Express JWT middleware for API protection. | ✅ Implemented |
| **Direct Messaging** | Creation of private 1-on-1 conversations enforcing exactly two members per conversation. `dmPair` unique constraint prevents duplicates. | ✅ Implemented |
| **Message History** | High-performance, cursor-based paginated retrieval of past messages. | ✅ Implemented |
| **Real-time Delivery** | Messages broadcasted instantly to participants via Socket.io rooms (`conversation:{id}`). Dual path: socket + REST fallback. | ✅ Implemented |
| **Read Receipts** | Optimistic UI updates. Persisted via `lastReadMessageId` on the `ConversationMember` junction table. Broadcast via `message:read` socket event. | ✅ Implemented |
| **Presence System** | Online/offline tracking backed by Upstash Redis with in-memory fallback. Dual-writes to both stores. Multi-tab support via socket ID Sets. `PresenceIndicator` component renders green/gray dots. | ✅ Implemented |
| **Message Editing** | `editMessage` service with validation (owns message, not deleted). | 🟡 Service exists, no REST endpoint |
| **Message Soft-Delete** | `deletedAt` field on Message schema + migration applied. | 🟡 Schema done, no API endpoint |
| **New Conversation Notification** | Server dynamically joins sockets to new rooms and emits `conversation:new` to each participant's `user:<userId>` room. | ✅ Implemented |
| **Rate Limiting** | Socket middleware (10 msg/10s) + REST `generalLimiter` and `messageLimiter`. | ✅ Implemented |

---

## 3. Architecture & Tech Stack

Nexus employs a decoupled frontend and backend architecture housed in a single monorepo to maximize code sharing and DX.

### Tech Stack

| Layer | Technology | Rationale / Notes |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** | Provides SSR/CSR flexibility and powerful Edge Middleware for routing. |
| **UI Language** | **React 19 + TypeScript** | Strongly typed components using the feature-sliced `modules/` architectural pattern. |
| **Styling** | **Tailwind CSS v4** | Utility-first CSS for rapid, maintainable design. |
| **Backend Framework** | **Express.js + TypeScript** | Lightweight REST API foundation. |
| **Real-time** | **Socket.io** | WebSocket abstraction with built-in rooms, automatic reconnection, and polling fallbacks. |
| **Database & ORM** | **Supabase PostgreSQL + Prisma** | Relational data integrity with type-safe database queries. |
| **Authentication** | **Supabase Auth** | Delegated identity provider, session management via cookies (`@supabase/ssr`). |
| **Caching / Presence** | **Upstash Redis** | Sub-millisecond reads/writes for ephemeral user online statuses. Dual-write with in-memory fallback. |

### High-Level System Flow

```mermaid
flowchart TD
    Client["Next.js Client (React)"]
    Server["Express.js Server (REST + Socket.io)"]
    DB["Supabase PostgreSQL"]
    Cache["Upstash Redis (Presence)"]
    Auth["Supabase Auth"]

    Client -->|REST and WebSocket| Server
    Server -->|Events| Client
    Server -->|Prisma ORM| DB
    Server -->|Read/Write| Cache
    Client -->|Manage Session| Auth
    Server -->|Verify JWKS Locally| Auth
```

---

## 4. Database Schema

The core relational database is designed for scale, utilizing strict foreign key constraints and compound unique indexes.

### Core Entities (Phase 1)

| Table | Purpose | Key Indexes / Constraints |
|---|---|---|
| `User` | Authenticated users synced automatically from Supabase Auth via a database trigger. | `UNIQUE(email)` |
| `Conversation` | Contains DMs (Phase 1) and Channels (Phase 2). | `UNIQUE(dmPair)` (Ensures only one DM exists per user pair) |
| `ConversationMember` | Junction linking users to conversations. Holds the `lastReadMessageId` for read receipts. | `UNIQUE(conversationId, userId)`<br>`INDEX(userId, conversationId)` |
| `Message` | Contains message text, sender ID, and conversation ID. Primary Keys are monotonically increasing **UUIDv7**. Includes `deletedAt` for soft-delete. | `INDEX(conversationId, id)` (Crucial for high-speed cursor pagination) |

```mermaid
erDiagram
    USER ||--o{ CONVERSATION_MEMBER : has
    USER ||--o{ MESSAGE : sends

    CONVERSATION ||--o{ CONVERSATION_MEMBER : includes
    CONVERSATION ||--o{ MESSAGE : contains

    USER {
        uuid id PK
        string email
        string username
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }

    CONVERSATION {
        uuid id PK
        string type "DM or CHANNEL"
        boolean isPrivate
        string dmPair "userId_userId"
        datetime createdAt
        datetime updatedAt
    }

    CONVERSATION_MEMBER {
        uuid id PK
        uuid conversationId FK
        uuid userId FK
        uuid lastReadMessageId FK "nullable"
        datetime joinedAt
    }

    MESSAGE {
        uuid id PK
        string content
        uuid conversationId FK
        uuid userId FK
        boolean isEdited
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable, soft-delete"
    }
```

---

## 5. Data Flow & Networking

Client-server communication is divided into two strict pathways to separate persistent data actions from ephemeral real-time updates.

1. **REST (HTTP):** Used for initial data fetching, complex queries, and mutations (e.g., creating a DM, sending a message to the DB).
2. **WebSocket (Socket.io):** Used strictly for push-based real-time events (e.g., receiving a message someone else sent, seeing a user come online).

### Message Delivery Flow
1. **Send:** The client emits a `message:send` Socket.io event with a deterministic `tempId` and immediately renders it (Optimistic UI) with `pending: true`. *(Fallback: `POST /api/conversations/:id/messages`)*
2. **Persist:** The Express socket handler validates the user and saves the message to PostgreSQL via Prisma inside a `$transaction` (also updates conversation `updatedAt`).
3. **Broadcast:** Upon successful persistence, the server emits a `message:new` Socket.io event to the `conversation:{id}` room.
4. **Acknowledge:** The server acknowledges the sender's socket, passing back the saved message to replace the `tempId` optimistic UI.
5. **Receive:** Connected clients in that room receive the `message:new` broadcast and update their React state instantly via TanStack Query cache injection.

### Presence Flow
1. **Connect:** `presenceStore.addSocket()` dual-writes to Redis Set + in-memory Map. If first connection, broadcasts `user:online`.
2. **Initial snapshot:** Server sends `presence:initial` with all online user IDs to the connecting socket.
3. **Disconnect:** `presenceStore.removeSocket()` removes from both stores. If last socket, broadcasts `user:offline`.
4. **Client:** `usePresence` hook updates `chatStore.onlineUsers`. `PresenceIndicator` renders green/gray dot.

### New Conversation Flow
1. `POST /api/conversations` creates DM via `createOrGetDM`.
2. Server iterates active sockets (`io.sockets.sockets`) and calls `socket.join()` for each participant.
3. Server emits `conversation:new` to each participant's `user:<userId>` room.
4. Client-side `useGlobalSocket` receives `conversation:new` and prepends to sidebar cache.

---

## 6. API & Socket Contracts

> **Note:** All REST endpoints require an `Authorization: Bearer <JWT>` header unless marked public.

### REST API

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/me` | Retrieve the currently authenticated user profile. |
| `GET` | `/api/conversations` | List all DM conversations for the current user. |
| `POST` | `/api/conversations` | Create a new DM or return an existing one (idempotent). |
| `GET` | `/api/conversations/:id` | Get details of a single conversation. |
| `GET` | `/api/conversations/:id/messages` | Cursor-based paginated retrieval of a conversation's messages. |
| `POST` | `/api/conversations/:id/messages` | Send and persist a new message (Fallback for `message:send` socket event). |
| `PATCH` | `/api/conversations/:id/read` | Update the user's `lastReadMessageId` for read receipts. Broadcasts `message:read`. |
| `GET` | `/api/users` | List all registered users (for DM creation search). |

*(Note: Registration, login, and logout are handled directly by the Supabase Client SDK in Next.js).*

### Socket.io Events

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `message:send` | `{ tempId, conversationId, content }` | Send a message. Expects acknowledgment with official `Message` object. |

**Server → Client**

| Event | Payload | Description |
|---|---|---|
| `message:new` | `Message` object | Broadcasts a newly persisted message to the conversation room. |
| `message:read` | `{ userId, conversationId, lastReadMessageId }` | Broadcasts that a user has read up to a specific message. |
| `user:online` | `{ userId }` | Broadcasts when a user establishes their first socket connection. |
| `user:offline` | `{ userId }` | Broadcasts when a user completely disconnects (all tabs closed). |
| `presence:initial` | `{ userIds: string[] }` | Sent to connecting socket with snapshot of all online users. |
| `conversation:new` | `Conversation` object | Sent to `user:<userId>` room when a new DM is created. |

---

## 7. Environment Setup

To run Nexus locally, you must configure both the client and server environment variables.

### Client (`client/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Server (`server/.env`)
```env
DATABASE_URL="postgresql://user:password@aws-0-xyz.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@aws-0-xyz.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://xyz.supabase.co"
REDIS_URL="redis://default:password@localhost:6379"
PORT=4000
CLIENT_URL="http://localhost:3000"
```

> [!TIP]
> The server requires the `SUPABASE_URL` to dynamically fetch and cache the Supabase JWKS (JSON Web Key Set). This allows Express to cryptographically verify JWTs locally without making a network request to Supabase on every API call.

---

## 8. Known Issues & Technical Debt

| Issue | Impact | Priority |
|---|---|---|
| Cursor pagination orders by `createdAt: "desc"` instead of `id` | UUIDv7 monotonic ordering not used; may cause ordering edge cases with rapid messages | Medium |
| Soft-deleted messages not filtered in `getMessages` | Deleted messages still appear in history | Low (no delete endpoint yet) |
| REST rate limiters read `process.env` directly | Should use `ENV` config object for consistency | Low |
| No `reset-password` page UI | Forgot password email sends, but user has no UI to enter new password | Low |
| No explicit `supabase.auth.signOut()` before 401 redirect | Session cookie may not be fully cleared on auth failure | Low |
