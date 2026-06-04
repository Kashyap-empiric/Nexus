# Nexus

## Project Overview

Nexus is a real-time messaging and collaboration platform.

Phase 1 focuses on building a robust messaging foundation consisting of authentication, direct messaging, message persistence, read receipts, and user presence.

Subsequent phases extend this foundation with workspaces, public channels, private channels, reactions, and advanced collaboration features.

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Frontend** | |
| Next.js | Provides the core React framework with Server-Side Rendering (SSR) for optimal performance and routing. |
| TypeScript | Ensures robust type safety across the application, enhancing maintainability and reducing runtime errors. |
| Tailwind CSS | Enables rapid UI development through a utility-first styling approach for consistent, responsive designs. |
| TanStack Query | Manages asynchronous state, data fetching, caching, and background updates seamlessly. |
| Zustand | Handles global client-side UI state that doesn't require server persistence in a lightweight manner. |
| **Backend** | |
| Express.js | Serves as the robust, minimalist API framework for handling core HTTP requests and middleware logic. |
| TypeScript | Maintains type consistency between the frontend and backend to streamline full-stack development. |
| Socket.io | Powers the real-time communication layer, enabling instant bi-directional messaging and events. |
| **Database & Auth** | |
| Supabase PostgreSQL | Acts as the primary relational database, supporting complex queries and structured data models. |
| Supabase Auth | Provides a secure, ready-to-use authentication system integrated directly with the database. Session lifecycle, token storage, and refresh handling are delegated entirely to Supabase Auth. |
| Prisma ORM | Simplifies database interactions and schema migrations through a type-safe, intuitive client. |
| **Infrastructure** | |
| Upstash Redis | Manages user presence tracking for real-time online/offline status. |
| GitHub Actions | Automates the CI/CD pipeline, ensuring consistent testing, linting, and deployment workflows. |
| Render | Hosts the Next.js application and Express backend services on a fully managed cloud platform. |


## High-Level Architecture

Nexus employs a decoupled architecture separating the client application from the core API and real-time services.

### Request Flow

```mermaid
flowchart TD
    Client[User / Browser]
    
    subgraph Frontend
    NextJS[Next.js App]
    end
    
    subgraph Backend Services
    API[Express.js REST API]
    end
    
    subgraph Data Layer
    Prisma[Prisma ORM]
    DB[(PostgreSQL)]
    end

    Client <-->|HTTP Requests / SSR| NextJS
    NextJS <-->|REST API Calls| API
    API <-->|Queries| Prisma
    Prisma <-->|SQL| DB
```

### Real-Time & Presence

```mermaid
flowchart TD
    Client[User / Browser]
    
    subgraph Real-Time Layer
    Socket[Socket.io Server]
    Redis[(Upstash Redis)]
    end

    Client <-->|WebSocket Events| Socket
    Socket <-->|Presence Tracking| Redis
```

## API Overview

Nexus follows a hybrid architecture, utilizing REST APIs for persistence and resource management, and Socket.io for real-time event delivery.

| Endpoint Group | Purpose | Phase |
| :--- | :--- | :--- |
| /auth | Authentication | Phase 1 |
| /conversations | DMs (Phase 1), Channels (Phase 2+) | Phase 1 |
| /messages | Message CRUD | Phase 1 |
| /workspaces | Workspace management | Phase 2 |
| /members | Membership management | Phase 2 |
| /reactions | Emoji reactions | Phase 2 |
| /notifications | Notification preferences | Phase 2 |

### REST vs Socket.io Responsibilities

**REST:**
* Create resources
* Read history
* Update resources
* Delete resources

**Socket.io:**
* New message events
* Presence updates
* Reaction updates
* Read receipts

### Rate Limiting

Rate limiting is a **hard requirement**, not optional. All limits are keyed per authenticated user ID, not per IP.

| Scope | Rule |
| :--- | :--- |
| REST — General | 100 requests / minute per user |
| REST — `POST /conversations/:id/messages` | 20 requests / 10 seconds per user |
| Socket.io — Message events | 20 events / 10 seconds per socket connection |

* The stricter message-send limit applies both at the REST layer and the Socket.io layer independently.
* Requests exceeding the limit must receive a `429 Too Many Requests` response (REST) or an error event (Socket.io).

### Message Pagination

All message list endpoints use **cursor-based pagination**. Offset-based pagination (`page=1`, `page=2`) is explicitly forbidden — new messages arriving mid-scroll shift offsets and produce duplicates.

**Endpoint:** `GET /conversations/:id/messages?cursor=<messageId>&limit=50&direction=before`

* `cursor` — a `messageId` (UUIDv7). Returns messages older than this ID when `direction=before`.
* `limit` — maximum number of messages to return (default 50).
* `direction` — currently `before` only; reserved for future bidirectional scroll support.

**Response shape:**
```json
{ "messages": [...], "nextCursor": "<messageId | null>", "hasMore": true }
```

* The server fetches `limit + 1` rows to determine `hasMore`, then trims the extra row before responding.
* This must be implemented from day one, not added later.

```mermaid
flowchart LR
    subgraph Client
    User[User]
    end

    subgraph Server
    REST[REST API]
    SocketIO[Socket.io Server]
    end

    subgraph Data Layer
    DB[(Database)]
    end
    
    subgraph Other
    OtherClients[Other Clients]
    end

    User -->|HTTP requests| REST
    REST -->|Persistence| DB
    
    User <-->|WebSocket events| SocketIO
    SocketIO <-->|Broadcasts| OtherClients
```

### Socket.io Event Design

The initial Phase 1 event contract supports real-time messaging, immediate read receipt updates, and presence by directly mapping user actions to socket broadcasts.

**Client → Server:**
* `conversation:join` - Subscribes to a conversation's real-time events.
* `conversation:leave` - Unsubscribes from a conversation.

**Server → Client:**
* `message:new` - Broadcasts a new message to conversation participants.
* `message:read` - Broadcasts updated read receipts to conversation participants.
* `user:online` - Broadcasts that a user has connected.
* `user:offline` - Broadcasts that a user has disconnected.

### Socket Room Authorization

> 🔒 **Security Requirement:** Socket room access is protected by two independent layers. Both must pass before a client may join a room. This is not optional.

**Layer 1 — Handshake JWT validation:**
* Socket.io middleware validates the Supabase Auth JWT on every connection before any event handlers run.
* Connections that fail JWT validation are rejected immediately with no room access.

**Layer 2 — Membership check on `conversation:join`:**
* Inside the `conversation:join` handler, the server queries the database to verify the authenticated user is an active `ConversationMember` of the requested conversation.
* If the user is not a member, the server emits an `error` event (e.g., `{ code: 'FORBIDDEN', message: 'Not a member of this conversation' }`) and returns early without calling `socket.join()`.
* This prevents a fully authenticated user from subscribing to a conversation they are not part of.

### Socket Room Strategy

* Each Conversation maps directly to a Socket.IO room.
* Room naming convention should follow: `conversation:{conversationId}`
  * Example: `conversation:123`
* When users open a conversation, they join the corresponding room (subject to the two-layer authorization above).
* New messages are emitted only to members of that room.
* Read receipt events are emitted only to room participants.
* This architecture naturally scales from Direct Messages to Channels because both are represented by the Conversation entity.

**Example Flow:**
1. User A joins `conversation:123`
2. User B joins `conversation:123`
3. User A sends POST request to `/conversations/123/messages`
4. Server persists message
5. Server emits `message:new` to room `conversation:123` via Socket.io
6. Server returns 201 Created to User A

## Core Features

### Phase 1: Core Foundation

*   **Authentication**: Secure user registration and login utilizing Supabase Auth, supporting email/password and OAuth providers. Session management ensures secure access to protected resources. On every successful registration and login, the app upserts the user into the local `USER` table via a Supabase Auth webhook or on-login upsert to guarantee consistency.

*   **Direct Messages**: Private one-to-one conversations between users. This is the primary messaging unit for Phase 1, modeled using the Conversation entity.


*   **Real-time Messaging**: Instant delivery of messages and updates across connected clients using WebSockets (Socket.io). Ensures all users see the most current state immediately.


*   **Message History**: Persistent storage of messages allowing users to view past conversations. Messages are ordered by `id` ascending (UUIDv7), never by `created_at`.

*   **Read Receipts**: Tracked using `ConversationMember.lastReadMessageId` (a nullable FK to `Message.id`). This approach avoids storing a separate read record for every message and scales efficiently for direct-message conversations. The logic follows:
    *   **Unread messages**: `message.id > lastReadMessageId` (relies on UUIDv7 monotonic ordering)
    *   **Seen messages**: `message.id <= lastReadMessageId`
    *   `created_at` is retained on the Message model for display purposes only (e.g., "sent 2 mins ago") and is never used for ordering or cursor comparison.


*   **Presence System**: Real-time indicators showing whether a user is currently online or offline. This system is driven by Socket connections, Socket disconnections, heartbeats (if implemented), and Redis presence storage. Presence is not a primary REST API feature; if a presence endpoint is retained, it is strictly optional and secondary to the real-time system.


### Phase 2: Collaboration Extensions

*   **Workspaces**: Isolated environments that encapsulate channels, direct messages, and members.
*   **Workspace Roles**: Role-based access control (RBAC) defining permissions within a workspace (e.g., Owner, Admin, Member).
*   **Public Channels**: Open communication spaces within a workspace accessible to all members.
*   **Private Channels**: Restricted communication spaces for specific members within a workspace.
*   **Message Reactions**: Users can append emoji reactions to messages to acknowledge or express emotion concisely.
*   **Rich Text Formatting**: Supports advanced message formatting such as bold, italics, code blocks, and lists.

## Core Database Schema

The database is designed around a normalized relational model to ensure data integrity and support complex querying.

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : has
    USER ||--o{ CONVERSATION_MEMBER : has
    USER ||--o{ MESSAGE : sends
    USER ||--o{ REACTION : creates
    
    WORKSPACE ||--o{ WORKSPACE_MEMBER : contains
    WORKSPACE ||--o{ CONVERSATION : contains
    
    CONVERSATION ||--o{ CONVERSATION_MEMBER : includes
    CONVERSATION ||--o{ MESSAGE : contains
    
    MESSAGE ||--o{ REACTION : receives
    MESSAGE ||--o{ CONVERSATION_MEMBER : "lastReadMessageId"
    
    USER {
        uuid id PK
        string email
        string name
        string avatar_url
        datetime created_at
    }
    
    WORKSPACE {
        uuid id PK
        string name
        string slug
        datetime created_at
    }
    
    WORKSPACE_MEMBER {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        enum role "OWNER, ADMIN, MEMBER"
    }
    
    CONVERSATION {
        uuid id PK
        uuid workspace_id FK "nullable for DMs"
        string name "nullable for DMs"
        enum type "CHANNEL, DM"
        boolean is_private
        string dm_pair "nullable, DM only, unique"
    }
    
    CONVERSATION_MEMBER {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        string lastReadMessageId FK "nullable, FK to Message.id"
    }
    
    MESSAGE {
        uuid id PK "UUIDv7"
        string content
        uuid conversation_id FK
        uuid user_id FK
        boolean is_edited
        datetime created_at "display only"
    }
    
    REACTION {
        uuid id PK
        string emoji
        uuid message_id FK
        uuid user_id FK
    }
```

### Entity Details

#### Phase 1 Core Entities

The following entities are the Phase 1 implementation focus:
*   **User**: Represents an authenticated individual using the platform. Key fields include `id`, `email`, and `name`.
*   **Conversation**: The central entity for any communication stream. In Phase 1, this strictly handles Direct Messages (`type = DM`). **Constraint:** DM conversations must have exactly 2 members.
    *   **`dm_pair`** (nullable String): Only populated when `type = 'DM'`. Value is the two member user IDs sorted alphabetically and joined with a colon (e.g., `"uuid-a:uuid-b"`). A unique index on this field enforces the one-DM-per-pair constraint at the database level.


*   **ConversationMember**: A junction table defining which users are participants in a specific conversation. It tracks read receipts via `lastReadMessageId` (nullable FK to `Message.id`).
    *   *Indexes (both required):*
        *   `@@unique([conversationId, userId])` — prevents duplicate memberships and serves as the index for "get members of a conversation".
        *   `@@index([userId, conversationId])` — required for "get all conversations for a user" (sidebar/inbox query). **This index was missing from the original spec.**
*   **Message**: A single piece of communication sent by a user within a conversation. `Message.id` uses **UUIDv7** (generated in the application layer using the `uuidv7` npm package), which is both globally unique and monotonically sortable. Messages are ordered by `id` ascending. `created_at` is retained for display purposes only (e.g., "sent 2 mins ago") and must never be used for ordering or cursor comparison.
    *   *Index:* `@@index([conversationId, id])`

#### Phase 2+ Entities

Workspace, WorkspaceMember, and Reaction are Phase 2 entities built on top of the messaging foundation:
*   **Workspace**: A logical container for a team or organization. Contains members and conversations.
*   **WorkspaceMember**: A junction table defining a user's membership and role within a specific workspace.
    *   *Index:* `@@index([workspaceId, userId])`
*   **Reaction**: A junction table linking users, messages, and emoji reactions.
    *   **Unique constraint:** `@@unique([messageId, userId, emoji])` — prevents a user from adding the same emoji reaction twice to the same message.
    *   **Cascade delete:** The relation to `Message` uses `onDelete: Cascade`, so reactions are automatically deleted when their parent message is deleted.
    *   **Toggle semantics:** Toggling a reaction must use a **lookup-then-delete** or **lookup-then-create** pattern, not `upsert`. The toggle logic needs to know which action was taken (add vs. remove) in order to broadcast the correct socket event (`reaction:added` vs. `reaction:removed`).

## Frontend Architecture

### State Management

There is a strict boundary between TanStack Query and Zustand. Mixing these responsibilities is not permitted.

| Library | Owns |
| :--- | :--- |
| **TanStack Query** | Anything that originates from the server: messages, conversations, user profiles, read receipts, presence snapshots |
| **Zustand** | Purely local UI state with no server equivalent |

**What lives in Zustand:**
* `activeConversationId` — the currently open conversation.
* Per-conversation draft text — stored as a `Map<conversationId, string>` so drafts survive conversation switching.
* `socketStatus: 'connecting' | 'connected' | 'disconnected'` — current socket connection state.
* Emoji picker open state and target `messageId`.

### TanStack Query + Socket.io Integration

Socket.io events mutate the TanStack Query cache **directly**. They must not trigger refetches.

* Incoming `message:new` events are **injected** into the paginated message cache for the relevant conversation via `queryClient.setQueryData`.
* Incoming `message:read` events **update** the receipt cache for the relevant conversation via `queryClient.setQueryData`.
* Query keys must be defined centrally (e.g., `messageKeys`, `conversationKeys`) and shared across all hooks. Ad-hoc inline key strings are not allowed.

### Optimistic Updates

Messages must feel instant. The following lifecycle applies to every send:

**Message status field:** `'pending' | 'sent' | 'delivered' | 'read' | 'failed'`

1. **On send (`onMutate`):** A temporary message is added to the TanStack Query cache immediately with a `localId` (UUIDv7, generated client-side) and `status: 'pending'`. The UI renders it at once.
2. **On server ack (`onSuccess`):** The temporary entry is replaced with the real server message (real `id`, `status: 'sent'`). The pending message is removed.
3. **On failure (`onError`):** `status` is set to `'failed'`. A retry option is displayed to the user. The previous cache snapshot (captured in `onMutate`) is restored for all other state.

TanStack Query's `onMutate` / `onSuccess` / `onError` mutation lifecycle handles this entirely.

## Architectural Decisions

### Unified Conversation Model

Nexus prioritizes **Direct Messages as the first implementation (Phase 1)** to establish a robust, real-time messaging foundation. 

We use a single `Conversation` entity instead of separate `Channel` and `DirectMessage` tables. This unified model is crucial because it allows us to build and perfect the core messaging mechanics (sending, real-time delivery, read receipts, persistence) on a simple 1-on-1 level first. 

**Channels are simply another Conversation type built later.** When we expand to Workspaces in Phase 2, a "Channel" is just a Conversation with `type = CHANNEL` and a linked `workspaceId`. By using this unified model, all the complex messaging logic built for Phase 1 instantly applies to channels without rewriting any core infrastructure. This approach significantly reduces schema complexity and allows the application to share messaging logic across all chat types.

#### Why Direct Messages First?

* Direct Messages are the simplest form of conversation.
* They allow messaging, persistence, presence, socket architecture, and read receipts to be validated with minimal complexity.
* Once these systems are proven, Channels become a natural extension because they reuse the same Conversation abstraction.
* This reduces implementation risk and allows incremental delivery of features.

### Junction Tables

We explicitly model many-to-many relationships using junction tables:
*   `WorkspaceMember` connects users to workspaces while holding role data.
*   `ConversationMember` connects users to conversations while holding read receipts.
*   `Reaction` connects users to messages with specific emojis.

This ensures strict data normalization, prevents redundant data, and allows us to store contextual metadata alongside the relationship itself.

### Prisma ORM

Prisma was selected for its robust type safety and excellent TypeScript support. It provides an intuitive schema definition language that makes migration management straightforward. The auto-generated Prisma Client significantly boosts developer productivity by catching query errors at compile time rather than runtime.

### Supabase Auth

Supabase Auth provides tight integration with our PostgreSQL database, offering built-in authentication flows that drastically reduce operational complexity. It supports email/password, OAuth providers, and MFA out of the box, ensuring secure session management without reinventing the wheel.

**Authentication Session Ownership:**
* Authentication sessions are managed by Supabase Auth.
* Session lifecycle, token storage, refresh handling, and security are delegated to Supabase Auth.
* Application-specific data remains managed through Prisma and PostgreSQL.
* Authentication session tables are intentionally omitted from the application ER diagram because they are owned and managed by Supabase.



### Socket.io

Socket.io was chosen over long polling or native WebSockets because it provides robust bi-directional communication with low latency. It supports real-time events, automatic reconnections, and multiplexing (namespaces/rooms), which results in a significantly better user experience when delivering instant messages and presence updates.


### Redis

Redis is utilized exclusively for our real-time presence system, enabling fast presence tracking to show who is online or offline.

#### Redis Presence Model

The presence model uses a **Redis Set of socket IDs** per user, replacing the previous counter approach.

```text
Key:   user:presence:{userId}   (Redis Set)
Value: { socketId1, socketId2, ... }
TTL:   24 hours (reset on every SADD)
```

**Lifecycle:**
* **On connect:** `SADD user:presence:{userId} {socketId}` + reset TTL. Broadcast `user:online` if the Set size transitions from 0 to 1.
* **On disconnect:** `SREM user:presence:{userId} {socketId}`. If the Set is now empty, broadcast `user:offline`.
* **On server startup:** Flush all `user:presence:*` keys before accepting connections. Clients reconnect automatically and re-establish their presence entries.



## Development Roadmap

### Week 1 Deliverable

**Authentication:**
* Registration
* Login
* Session Management
* User sync to Prisma `USER` table on registration and login (upsert)
* Protected Routes

**Messaging:**
* Direct Message Conversations (with duplicate DM prevention via unique partial index)
* Message Persistence
* Message History
* Real-time Delivery via Socket.io (with JWT auth middleware on socket handshake)
* Read Receipts
* Presence Tracking (with Redis TTL and server-restart cleanup)

**Demo Scenario:**
1. User A logs in
2. User B logs in
3. User A sends a message
4. User B receives it instantly
5. User B opens the conversation
6. Message becomes marked as seen
7. Online/offline status updates in real time

### Week 1 Scope Boundary

Week 1 intentionally excludes:
* Workspaces
* Public Channels
* Private Channels
* Reactions
* Rich Text Formatting

The objective of Week 1 is to validate the messaging foundation:
* Authentication
* Direct Messaging
* Message Persistence
* Real-time Delivery
* Read Receipts
* Presence Tracking

All future collaboration features will be built on top of this validated messaging layer.

### Phase 1: Real-time Core
*   **Foundation & Project Setup**: Initialize the project structure, configure tooling, and establish CI/CD.
*   **Authentication & User Sync**: Implement Supabase Auth, user registration, login, and reliable upsert sync to the Prisma database.
*   **Direct Messaging API**: Core REST endpoints for conversations and message history, with duplicate DM prevention enforced at the database level.
*   **Socket.io Integration**: Real-time message delivery with JWT authentication middleware on the socket handshake.
*   **Read Receipts**: Unread indicators and tracking via `lastReadMessageId` on `ConversationMember`.
*   **Presence System**: Real-time online/offline status powered by Redis, with TTL on presence keys and cleanup on server restart.

### Phase 2: Collaboration Extensions
*   **Workspaces & Memberships**: Workspace creation, switching, and role-based access control.
*   **Channels**: Public and private channels using the unified Conversation model.
*   **Reactions**: Emoji reaction system with real-time updates.
*   **Rich Text**: Advanced message formatting capabilities.

## Future Enhancements (v3)

*   **Deferred v1 Features**:
    *   **Link Unfurling & File Uploads**: Rich media sharing in conversations.
    *   **Search**: PostgreSQL-based full-text search system.
    *   **Background Processing**: BullMQ for background jobs and Resend for transactional emails.
    *   **Infrastructure Scaling**: Redis Pub/Sub for Socket.io scaling and general API caching.
*   **Communication**: WebRTC voice and video calls, and screen sharing.
*   **Analytics**: Workspace analytics, engagement dashboards, and usage metrics.
*   **AI Features**: AI workspace assistant, message summaries, semantic search, and smart recommendations.
*   **Infrastructure**: Microservices migration, event streaming, and distributed caching.
