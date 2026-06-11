# AS-IS System Architecture (Nexus Phase 1)

> **WARNING: This document represents the *actual* implemented reality of the Nexus platform. Do not assume idealized architectural paradigms.**

## 1. Request Flow (HTTP & REST)

Nexus uses Express.js for the REST API.
```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant Auth as Supabase Auth SDK
    participant API as Express API
    participant DB as Prisma (PostgreSQL)

    Client->>Auth: Login / Register
    Auth-->>Client: JWT Session
    Note over Auth,DB: Supabase Database Trigger syncs new users to public.User
    Client->>API: HTTP Request + Bearer JWT
    API->>API: Local ES256 JWKS Verification (Zero network)
    API->>DB: Prisma Query
    DB-->>API: Result
    API-->>Client: Response
```

### Deviations & Flaws:
- **Overloaded Controllers**: `messages.controller.ts` intercepts HTTP requests for `POST /`, `PATCH /:messageId`, and `DELETE /:messageId`. It calls the database service layer (`messages.service.ts`), but then *manually imports `socket.io`* to broadcast `MESSAGE_NEW`, `MESSAGE_UPDATE`, and `MESSAGE_DELETE`. This breaks MVC encapsulation.

## 2. Real-Time Flow (WebSocket)

Nexus uses Socket.io to push real-time updates.

```mermaid
sequenceDiagram
    participant Client as Next.js (useGlobalSocket / useConversationSocket)
    participant Socket as Socket.io Server
    participant Redis as Presence Store
    participant API as Express API (via HTTP)

    Client->>Socket: Connect (Auth handshake)
    Socket->>Redis: addSocket (Dual-write to In-Memory Map)
    Socket-->>Client: presence:initial, user:online
    
    Client->>Socket: MESSAGE_SEND { content, conversationId }
    Socket->>DB: createMessage()
    Socket-->>Room: MESSAGE_NEW (Broadcast)
    Socket-->>Room: CONVERSATION_UPDATE (Broadcast metadata)
    
    Note over Client,API: Client can also trigger events via REST
    Client->>API: PATCH /messages/:id
    API->>DB: editMessage()
    API-->>Room: MESSAGE_UPDATE (Broadcast)
    API-->>Room: CONVERSATION_UPDATE (Broadcast metadata)
```

### Deviations & Flaws:
- **Presence Scaling Trap**: The presence system uses a dual-write mechanism: Upstash Redis + In-Memory `Map`. While resilient for a single Node.js instance (shielding from Redis timeouts), the in-memory map lacks a Pub/Sub adapter to sync across multiple backend instances. **Nexus cannot scale horizontally** without fracturing presence state.
- **Decoupled Metadata Update**: The frontend relies entirely on the server explicitly emitting `CONVERSATION_UPDATE` to update sidebar previews (`latestMessage`) and timestamps. The client does *not* derive this from `MESSAGE_*` payloads.

## 3. Data Integrity & Transaction Boundaries

The backend uses Prisma, but some transaction boundaries remain broken.

### Resolved Issues (✅ Fixed on 2026-06-11):
- ~~**Race Condition in `deleteMessage` (CRITICAL)**: When deleting the `latestMessage`, the service fetches the next-most-recent message ID *before* the transaction starts.~~ → ✅ **FIXED**: `nextLatestMessageId` is now computed inside `prisma.$transaction(async (tx) => { ... })` using `tx.message.findFirst` with `deletedAt: null` filter.
- ~~**Soft-Delete Leakage**: `getMessages` does not apply `where: { deletedAt: null }` filter.~~ → ✅ **FIXED**: `getMessages` now filters `deletedAt: null`.
- ~~**Pagination Ordering Defect**: `getMessages` paginates using `orderBy: { createdAt: "desc" }`.~~ → ✅ **FIXED**: Now uses `orderBy: { id: "desc" }` (UUIDv7).

### Remaining Issues (⚠️ Still Unresolved):
- **Non-Transactional Reads in `editMessage`**: `editMessage` calls `getMessageById` (which performs ownership validation and `deletedAt` check) *outside* of the `$transaction`. The actual `prisma.message.update` is not wrapped in a transaction.

## 4. Frontend State Strategy

The frontend relies heavily on TanStack Query cache mutation.

### Deviations & Flaws:
- **Aggressive Optimistic Updates**: `useMessages.ts` injects `pending: true` payloads and creates a `tempId` upon sending. It directly mutates the query cache to swap the `tempId` with the final payload.
- **Cache Fragility**: The frontend handles deletions optimistically (using `markMessageDeletedInCache`) but is reliant on manual DOM/cache updates rather than clean server reconciliation.
