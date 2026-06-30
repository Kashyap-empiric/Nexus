# Nexus — System Architecture

> **Last Updated:** 2026-06-29
> **Purpose:** Visual and textual description of system architecture, component relationships, and communication patterns.

---

## 1. Layered Architecture

```mermaid
flowchart TB
    subgraph Presentation["Client (Next.js 16 + React 19)"]
        AR[App Router]
        MOD[Feature Modules<br/>auth, chat, messages, workspaces,<br/>conversations, notifications, etc.]
        SOCK_C[Socket.io Client]
        TQ[TanStack Query v5<br/>Server State Cache]
        ZS[Zustand v5<br/>UI State: socket, presence, typing]
    end

    subgraph API["Communication Layer"]
        HTTP[HTTP REST<br/>Axios]
        WS[WebSocket<br/>Socket.io]
    end

    subgraph Application["Server (Express.js 5)"]
        direction TB
        subgraph Middleware["Middleware Stack"]
            AUTH[Auth Middleware<br/>JWKS Verification]
            RL[Rate Limiter<br/>In-memory Token Bucket]
            VALID[Zod Validation]
            MEM[Membership Check]
        end
        ROUTES[REST Routes]
        CTRL[Controllers]
        SVC[Services]
        REPO[Repositories]
        SOCK_SRV[Socket.io Server]
        DISP[Socket Dispatcher<br/>Single Emission Path]
    end

    subgraph Infrastructure["Infrastructure"]
        PG[(PostgreSQL<br/>Supabase)]
        REDIS[(Upstash Redis<br/>Presence Cache)]
        SUPABASE[Supabase Auth<br/>JWKS + Session]
        SENDGRID[SendGrid<br/>Email Delivery]
    end

    AR --> MOD
    MOD --> TQ
    MOD --> ZS
    MOD --> SOCK_C
    TQ --> HTTP
    SOCK_C --> WS

    HTTP --> ROUTES
    ROUTES --> AUTH --> RL --> VALID --> MEM --> CTRL
    CTRL --> SVC --> REPO --> PG
    SVC --> DISP
    SVC --> SENDGRID

    WS --> SOCK_SRV
    SOCK_SRV --> AUTH
    SOCK_SRV --> DISP
    SOCK_SRV --> REDIS

    DISP --> SOCK_SRV
```

---

## 2. Module Dependency Graph

```mermaid
flowchart LR
    subgraph Client_Modules["Client Modules"]
        A[auth] --> CH[chat]
        A --> NV[conversations]
        A --> WS[workspaces]
        A --> MS[messages]
        A --> ST[settings]
        
        CH --> MS
        CH --> NV
        CH --> WS
        
        NV --> MS
        WS --> NV
        WS --> MS
        
        TH[threads] --> MS
        TH --> NV

        INV[invites] --> WS
        INV --> NV
        
        NOT[notifications] --> A
        
        ON[onboarding] --> WS
        ON --> A
        
        USR[users] --> A
        USR --> MS
    end

    subgraph Server_Modules["Server Modules"]
        S_A[auth] --> S_WS[workspaces]
        S_A --> S_CN[conversations]
        S_A --> S_MS[messages]
        S_A --> S_USR[users]
        
        S_WS --> S_CN
        S_CN --> S_MS
        
        S_INV[invites] --> S_WS
        S_INV --> S_CN
        
        S_NOT[notifications] --> S_WS
        S_NOT --> S_MS
        
        S_ON[onboarding] --> S_WS
    end
```

---

## 3. Communication Patterns

### REST API Flow (CRUD)

```
Client (TanStack Query) → Axios → Express Route → Auth Middleware → Controller → Service → Repository → Prisma → PostgreSQL
                                                                                                              │
                                                                                                     socket.dispatcher
                                                                                                              │
                                                                                                       Socket.io broadcast
```

- **Optimistic updates**: TanStack Query mutates the cache immediately, then reconciles with server response
- **Cache invalidation**: On mutation success, related queries are invalidated (e.g., sending a message invalidates the conversation list query)
- **Error handling**: Server returns `{ error: string }`; client `friendlyError()` maps to user-friendly messages

### Real-Time Flow (WebSocket)

```
Client A → emit("message:send", payload) → Socket.io Server → Auth Middleware → Handler → Prisma Transaction → socket.dispatcher → Client B
                                                                                      │                       │
                                                                                 callback({success, data})    Client A (ack: tempId → real ID)
```

- **Dual delivery**: Both the sender (via ack callback) and other clients (via room broadcast) receive the event
- **Room isolation**: Events are scoped to `conversation:<id>` rooms — users only receive events for conversations they're members of

### Presence Flow

```
Client connects → Auth middleware (verify JWT) → PresenceStore.addSocket(userId, socketId)
    → Redis SADD → is first connection? → broadcast "user:online" → all connected clients
```

- **Multi-tab aware**: A user only appears "offline" when ALL their sockets disconnect
- **Dual-write**: Redis + in-memory Map for resilience
- **On disconnect**: Last seen timestamp written to Redis

---

## 4. Server Module Pattern

Every REST module follows a consistent layered architecture:

```
routes.ts       → HTTP route definitions + Zod validation schemas
controller.ts   → Request handling, response formatting, error mapping
service.ts      → Business logic, authorization, orchestrates repositories
repository.ts   → Prisma queries (data access layer)
types.ts        → TypeScript interfaces
schema.ts       → Zod validation schemas
```

**Example — Workspaces module:**

```mermaid
flowchart LR
    WR[workspaces.routes.ts<br/>GET /api/workspaces<br/>POST /api/workspaces] --> WC[workspaces.controller.ts]
    WC --> WS[workspaces.service.ts]
    WS --> WRp[workspaces.repository.ts]
    WS --> D[socket.dispatcher.ts]
    WRp --> PG[(Prisma)]
    WC --> WSch[workspaces.schema.ts<br/>Zod validators]
```

---

## 5. Client Application Shell

```mermaid
flowchart TB
    AS[AppLayoutShell] --> NR[NavigationRail]
    AS --> SB[Sidebar]
    AS --> MC[Main Content Area]
    AS --> IP[InfoPanel]

    subgraph NR_Content["NavigationRail"]
        NR_W[Workspace Icons]
        NR_S[Settings Button]
        NR_N[Notification Bell]
    end

    subgraph SB_Content["Sidebar"]
        SB_C[Conversation List<br/>DMs + Channels]
        SB_H[Header: workspace name]
        SB_F[UserFooterMenu<br/>Status + Profile + Sign-out]
    end

    subgraph MC_Content["Main Content"]
        MC_H[Header: conversation name, members, search]
        MC_ML[MessageList<br/>Infinite Scroll]
        MC_MI[MessageInput<br/>Tiptap Editor]
        MC_TI[TypingIndicator]
    end

    subgraph TH_Content["ThreadPanel (right side)"]
        TH_R[Root Message Context]
        TH_L[Thread Reply List]
        TH_I[Thread Input]
    end

    subgraph IP_Content["RightPanel (toggleable)"]
        IP_A[About Section]
        IP_M[Member List]
        IP_P[Pinned Messages]
        IP_T[Threads Browser]
    end

    subgraph MN_Content["@Mention Autocomplete"]
        MN_S[mentionSuggestion.ts<br/>Filters members by query]
        MN_L[MentionList.tsx<br/>Dropdown with avatars]
        MN_T[Tippy.js popup]
    end

    subgraph TH_PART["Thread Participants"]
        TP_FO[Follow/Unfollow API]
        TP_LEV[Notification Level<br/>ALL / MENTIONS / MUTED]
        TP_AUTO[Auto-subscribe<br/>Root author + repliers]
    end
```

---

## 6. State Management Strategy

```mermaid
flowchart LR
    subgraph ServerState["Server State (TanStack Query)"]
        Q_CONV[conversations]
        Q_MSG[messages]
        Q_USR[users]
        Q_WS[workspaces]
        Q_NOT[notifications]
    end

    subgraph UIState["UI State (Zustand)"]
        Z_SOCK[socketStatus<br/>onlineUsers<br/>typingUsers]
        Z_CHAT[activeConversation<br/>activeWorkspace<br/>mode: DM | WORKSPACE]
        Z_THREAD[threadStore<br/>activeThread<br/>threadMessages]
    end

    subgraph SocketUpdates["Socket Event Handlers"]
        S_CONV[conversation.handlers]
        S_MSG[message.handlers]
        S_WS[workspace.handlers]
        S_NOT[notification.handlers]
        S_PRES[presence]
    end

    S_CONV -->|setQueryData| Q_CONV
    S_MSG -->|setQueryData| Q_MSG
    S_WS -->|setQueryData| Q_WS
    S_NOT -->|setQueryData| Q_NOT
    
    S_PRES -->|update| Z_SOCK
    S_MSG -->|update typing| Z_SOCK

    ServerState --> AppLayoutShell
    UIState --> AppLayoutShell
```

---

## 7. Socket Event Router (Client)

```mermaid
flowchart TB
    SE[Socket Event<br/>from server] --> ER[eventRouter.ts]
    
    ER -->|message:new| MH[message.handlers.ts<br/>→ Update message cache]
    ER -->|message:update| MH
    ER -->|message:delete| MH
    ER -->|message:read| MH
    ER -->|threadMessage:new| TH[message.handlers.ts<br/>→ Update thread cache]
    
    ER -->|conversation:new| CH[conversation.handlers.ts<br/>→ Update sidebar cache]
    ER -->|conversation:update| CH
    
    ER -->|user:online| PH[presence → socketStore.ts]
    ER -->|user:offline| PH
    ER -->|presence:initial| PH
    
    ER -->|notification:new| NH[notification.handlers.ts<br/>→ Update notification cache]
    ER -->|notification:update| NH
    
    ER -->|channel:update| WH[workspace.handlers.ts<br/>→ Update workspace cache]
    ER -->|member:update| WH
    ER -->|channel:member-added| WH
    ER -->|channel:member-removed| WH
```

---

## 8. Key Architecture Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **Channels reuse Conversation model** | A channel is a `Conversation` with `type: CHANNEL`. All message infrastructure (CRUD, pagination, pins) works identically for DMs and channels. |
| 2 | **Single socket emission path** | `socket.dispatcher.ts` is the only module that emits Socket.io events. Controllers never import `io` directly. |
| 3 | **UUIDv7 for all IDs** | Time-ordered for efficient cursor pagination. Generated in the app layer using the `uuidv7` npm package. |
| 4 | **Local JWKS verification** | Zero network calls for auth on each request. JWKS is cached on server start using the `jose` library. |
| 5 | **Dual-write presence** | Redis for production scale; in-memory Map for offline development and resilience against Redis failures. |
| 6 | **Soft deletes** | Messages use `deletedAt` rather than hard deletion. All queries filter `deletedAt: null`. |
| 7 | **Slug-based routing** | Workspaces use human-readable slugs: `/workspaces/{slug}/channels/{id}`. |
| 8 | **Repository pattern** | Services never call Prisma directly — all data access is abstracted behind repository functions. |
| 9 | **Navigation derived from URL** | Sidebar reads `mode`, `activeWorkspaceId` from URL params via `useRouteState` hook, not from Zustand store. Chat store still tracks `activeConversationId`. |
| 10 | **Threads as sub-messages** | Thread replies are `Message` records with `threadRootId` set. They share the same CRUD infrastructure as top-level messages but are queried via `threadRootId` index. |
