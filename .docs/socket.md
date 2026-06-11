# Nexus Socket Architecture

> **Last Updated:** 2026-06-11
> **Status:** Active (Phase 1 core features complete)

---

## 1. Overview

Nexus uses [Socket.io](https://socket.io/) v4 for all real-time communication. The socket layer is dual-purpose:
- **Primary transport** for sending and receiving messages in real-time
- **Secondary transport** for presence, read receipts, conversation metadata, and invite notifications

The server runs a single Socket.io instance attached to the Express HTTP server. Client connections are authenticated via JWT during the handshake, and room membership is derived from the user's `ConversationMember` records.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        SocketProvider["SocketProvider.tsx\n(connection lifecycle)"]
        useGlobalSocket["useGlobalSocket\n(sidebar events)"]
        useConvSocket["useConversationSocket\n(active conversation events)"]
        usePresence["usePresence\n(user presence)"]
    end

    subgraph Server["Server Layer"]
        SocketInit["socket.ts\n(init, auth, room join)"]
        Dispatcher["socket.dispatcher.ts\n(event dispatch helpers)"]
        PresenceStore["presenceStore.ts\n(Redis + In-Memory)"]

        subgraph Handlers["Socket Handlers"]
            MsgHandler["message.handler.ts\n(message:send)"]
            PresHandler["presence.handler.ts\n(connect/disconnect)"]
        end

        subgraph Middleware["Socket Middleware"]
            AuthMw["auth.ts\n(JWT verification)"]
            RateLimiter["rateLimiter.ts\n(10 msg/10s)"]
        end

        subgraph Controllers["HTTP Controllers"]
            MsgController["messages.controller.ts\n(broadcasts via dispatcher)"]
            ConvController["conversations.controller.ts\n(broadcasts via dispatcher)"]
            InviteController["invites.controller.ts\n(broadcasts via dispatcher)"]
        end
    end

    subgraph External["External Services"]
        DB["PostgreSQL (Prisma)"]
        Redis["Upstash Redis"]
    end

    SocketProvider -->|connect + auth| SocketInit
    SocketInit --> AuthMw
    AuthMw --> RateLimiter
    SocketInit --> Handlers
    Handlers --> Dispatcher
    Controllers --> Dispatcher
    PresHandler --> PresenceStore
    PresenceStore --> Redis
    MsgHandler --> DB
    Dispatcher -->|emit| SocketProvider
```

---

## 2. Socket Events Reference

### 2.1 Event Name Constants

Both client and server share identical event name constants via `shared/socket-events.ts`:

```typescript
export const SOCKET_EVENTS = {
  MESSAGE_NEW: "message:new",
  MESSAGE_READ: "message:read",
  MESSAGE_SEND: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  INITIAL_PRESENCE: "presence:initial",
  CONVERSATION_NEW: "conversation:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  CONVERSATION_UPDATE: "conversation:update",
} as const;
```

> **Note:** `TYPING_START` and `TYPING_STOP` are defined in the constants but **not yet implemented** in any handler.

### 2.2 Event Table

| Direction | Event | Payload | Description | Source | Consumers |
|---|---|---|---|---|---|
| **C → S** | `message:send` | `{ tempId, conversationId, content }` | Send a new message via WebSocket | `message.handler.ts` | — |
| **S → C** | `message:new` | `Message` object | New message broadcast to conversation room | `messages.controller.ts` / `message.handler.ts` | `useConversationSocket`, `useGlobalSocket` |
| **S → C** | `message:update` | `Message` object | Updated (edited) message broadcast to conversation room | `messages.controller.ts` | `useConversationSocket` |
| **S → C** | `message:delete` | `Message` object (with `deletedAt`) | Soft-deleted message broadcast to conversation room | `messages.controller.ts` | `useConversationSocket` |
| **S → C** | `message:read` | `{ conversationId, userId, lastReadMessageId }` | Read receipt broadcast to conversation room | `conversations.controller.ts` | `useConversationSocket`, `useGlobalSocket` |
| **S → C** | `user:online` | `{ userId }` | User came online (first socket opened) | `presence.handler.ts` | `SocketProvider` |
| **S → C** | `user:offline` | `{ userId }` | User went offline (all sockets closed) | `presence.handler.ts` | `SocketProvider` |
| **S → C** | `presence:initial` | `{ userIds: string[] }` | Snapshot of all currently online users, sent on connect | `presence.handler.ts` | `SocketProvider` |
| **S → C** | `conversation:new` | `Conversation` object | New conversation created (DM created / invite accepted) | `conversations.controller.ts` / `invites.controller.ts` | `useGlobalSocket` |
| **S → C** | `conversation:update` | `{ conversation }` with metadata | Conversation metadata changed (latestMessage, updatedAt) | `messages.controller.ts` / `messages.service.ts` | `useGlobalSocket` |
| **—** | `typing:start` | *Not implemented* | — | — | — |
| **—** | `typing:stop` | *Not implemented* | — | — | — |

---

## 3. Room Strategy

Nexus uses two room patterns:

| Room Pattern | Format | Purpose | Joined When |
|---|---|---|---|
| **Conversation Room** | `conversation:{conversationId}` | Broadcasting messages, read receipts, and metadata updates to conversation participants | On socket connection (server auto-joins all user's member conversations) and on new conversation creation |
| **User Room** | `user:{userId}` | Targeted server-to-client notifications (e.g., new conversation notification) | On socket connection |

### Room Joining Flow

```mermaid
sequenceDiagram
    participant Socket as Client Socket
    participant Server as Socket.io Server
    participant DB as PostgreSQL (Prisma)
    participant Dispatcher as socket.dispatcher.ts

    Note over Socket,Server: 1. Connection
    Socket->>Server: connect (JWT in handshake)
    Server->>Server: verify JWT (socketAuthMiddleware)
    Server-->>Socket: ack connected

    Note over Server,DB: 2. Auto-Join Rooms
    Server->>DB: query ConversationMember where userId = X
    DB-->>Server: [ { conversationId: "abc" }, { conversationId: "def" } ]
    Server->>Server: socket.join("conversation:abc")
    Server->>Server: socket.join("conversation:def")
    Server->>Server: socket.join("user:X")

    Note over Socket,Server: 3. New Conversation Created
    Dispatcher->>Dispatcher: dispatchConversationNew(conversation)
    Dispatcher->>Server: iterate sockets in user rooms
    Server->>Server: socket.join("conversation:newConvId")
    Dispatcher->>Server: io.to("user:Y").emit("conversation:new", conv)
```

---

## 4. Connection Lifecycle

### 4.1 Client-Side Initialization

The client socket is configured in `client/src/shared/lib/socket.ts`:

```typescript
const socket = io(SOCKET_URL, {
  autoConnect: false,  // Manual connection control
  auth: async (cb) => {
    const { data: { session } } = await supabase.auth.getSession();
    cb({ token: session?.access_token });
  },
});
```

The `SocketProvider` component (`client/src/shared/providers/socket-provider.tsx`) manages the connection lifecycle and presence listeners:

```mermaid
sequenceDiagram
    participant App as Application
    participant Provider as SocketProvider
    participant Socket as Socket.io Client
    participant Server as Socket.io Server
    participant Store as Zustand Store

    App->>Provider: mount

    Provider->>Socket: connect()

    Socket->>Server: handshake (JWT)
    Server-->>Socket: connected
    Socket-->>Provider: "connect" event
    Provider->>Store: setSocketStatus("connected")

    Server->>Socket: "presence:initial" { userIds: [...] }
    Socket-->>Provider: handleInitialPresence
    Provider->>Store: setInitialOnlineUsers(userIds)

    Note over Provider,Store: (user goes online elsewhere)
    Server->>Socket: "user:online" { userId }
    Socket-->>Provider: handleUserOnline
    Provider->>Store: addUserOnline(userId)

    Note over Provider,Store: (user disconnects)
    Server->>Socket: "user:offline" { userId }
    Socket-->>Provider: handleUserOffline
    Provider->>Store: removeUserOffline(userId)

    Note over Provider,Store: (disconnect)
    Provider->>Socket: unmount
    Provider->>Store: setSocketStatus("disconnected")
```

### 4.2 Server-Side Connection Handling

The server initializes Socket.io in `server/src/socket/socket.ts`:

```mermaid
sequenceDiagram
    participant Client
    participant Server as socket.ts
    participant Auth as auth middleware
    participant RateLimiter as rateLimiter middleware
    participant DB as Prisma
    participant Handler as message.handler.ts
    participant Presence as presence.handler.ts

    Client->>Server: connect
    Server->>Auth: socketAuthMiddleware
    Auth->>Auth: verify JWT (local ES256 JWKS)
    Auth-->>Server: socket.data.user = user
    Server->>Server: socket.use(rateLimiter)

    Server->>DB: fetch ConversationMember records
    DB-->>Server: [conversationId, ...]
    Server->>Server: socket.join("conversation:{id}") for each
    Server->>Server: socket.join("user:{userId}")

    Server->>Presence: registerPresenceHandlers(io, socket)
    Note over Presence: (see section 6)

    Server->>Handler: registerMessageHandlers(io, socket)
    Note over Handler: listens for "message:send"
```

---

## 5. Message Flow

### 5.1 Sending a Message (WebSocket Path)

This is the primary path used by the client when sending a message:

```mermaid
sequenceDiagram
    participant SenderUI as MessageInput.tsx
    participant useMsgs as useMessages.ts
    participant SocketClient as Socket.io Client
    participant SocketServer as Socket.io Server
    participant Handler as message.handler.ts
    participant Service as messages.service.ts
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher.ts
    participant Receiver as Receiver's Socket Client

    SenderUI->>useMsgs: submitMessage()
    useMsgs->>useMsgs: generate tempId
    useMsgs->>useMsgs: optimistic update (pending: true)
    useMsgs->>SocketClient: emit("message:send", { tempId, conversationId, content })

    SocketClient->>SocketServer: "message:send"
    SocketServer->>Handler: handle

    Handler->>Handler: validate userId & payload
    Handler->>Service: createMessage(conversationId, userId, content)

    Service->>Service: generate UUIDv7 messageId
    Service->>DB: $transaction [
    Service->>DB:   prisma.message.create(...)
    Service->>DB:   prisma.conversation.update(updatedAt, latestMessageId)
    Service->>DB:   prisma.conversationMember.update(lastReadMessageId)
    Service->>DB: ]
    DB-->>Service: { message, conversationMetadata }

    Service-->>Handler: { message, conversationMetadata }

    Handler->>Dispatcher: dispatchMessageEvent("NEW", conversationId, message, conversationMetadata)

    Dispatcher->>SocketServer: io.to("conversation:{id}").emit("message:new", message)
    Dispatcher->>SocketServer: io.to("conversation:{id}").emit("conversation:update", { conversation: metadata })

    SocketServer-->>Receiver: "message:new" (Message object)
    SocketServer-->>Receiver: "conversation:update" (metadata)

    Handler-->>SocketClient: callback({ success: true, data: message })
    SocketClient-->>useMsgs: onSuccess callback
    useMsgs->>useMsgs: replace optimistic message with real message
    useMsgs->>useMsgs: update conversation metadata
```

### 5.2 Sending a Message (REST Fallback Path)

The REST endpoint also broadcasts via socket after persisting:

```mermaid
sequenceDiagram
    participant Client as Client
    participant Controller as messages.controller.ts
    participant Service as messages.service.ts
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher.ts
    participant Room as Conversation Room

    Client->>Controller: POST /conversations/{id}/messages

    Controller->>Service: createMessage(conversationId, userId, content)
    Service->>DB: $transaction (create msg + update conv + update member)
    DB-->>Service: { message, conversationMetadata }
    Service-->>Controller: { message, conversationMetadata }

    Controller->>Dispatcher: dispatchMessageEvent("NEW", conversationId, message, conversationMetadata)
    Dispatcher->>Room: io.to("conversation:{id}").emit("message:new", message)
    Dispatcher->>Room: io.to("conversation:{id}").emit("conversation:update", metadata)

    Controller-->>Client: 201 { data: message }
```

### 5.3 Editing a Message

```mermaid
sequenceDiagram
    participant Client as Client
    participant Controller as messages.controller.ts
    participant Service as messages.service.ts
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher.ts
    participant Room as Conversation Room

    Client->>Controller: PATCH /conversations/{convId}/messages/{msgId}

    Controller->>Service: editMessage(messageId, userId, content)
    Service->>Service: getMessageById (⚠️ non-transactional)
    Service->>Service: validate ownership & not deleted
    Service->>DB: prisma.message.update(content, isEdited: true)
    DB-->>Service: updatedMessage
    Service-->>Controller: { message, conversationMetadata }

    Controller->>Dispatcher: dispatchMessageEvent("UPDATE", conversationId, message, metadata)
    Dispatcher->>Room: io.to("conversation:{id}").emit("message:update", message)
    Dispatcher->>Room: io.to("conversation:{id}").emit("conversation:update", metadata)

    Controller-->>Client: 200 { data: message }
```

**Client-side handling** (`useConversationSocket.ts`): Receives `message:update`, then dynamically imports `cacheHelpers.ts` → `updateMessageInCache()` to update the TanStack Query cache with the new content and `isEdited: true` flag.

### 5.4 Deleting a Message

```mermaid
sequenceDiagram
    participant Client as Client
    participant Controller as messages.controller.ts
    participant Service as messages.service.ts
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher.ts
    participant Room as Conversation Room

    Client->>Controller: DELETE /conversations/{convId}/messages/{msgId}

    Controller->>Service: deleteMessage(messageId, userId)
    Service->>Service: getMessageById (⚠️ non-transactional)
    Service->>Service: validate ownership & not already deleted
    Service->>Service: find next latest message (⚠️ race condition risk)
    Service->>DB: $transaction(update message set deletedAt, update conversation latestMessageId)
    DB-->>Service: updatedMessage
    Service-->>Controller: { message, conversationMetadata }

    Controller->>Dispatcher: dispatchMessageEvent("DELETE", conversationId, message, metadata)
    Dispatcher->>Room: io.to("conversation:{id}").emit("message:delete", message)
    Dispatcher->>Room: io.to("conversation:{id}").emit("conversation:update", metadata)

    Controller-->>Client: 200 { data: message }
```

**Client-side handling** (`useConversationSocket.ts`): Receives `message:delete`, then dynamically imports `cacheHelpers.ts` → `markMessageDeletedInCache()` to update the message with a `deletedAt` timestamp in the cache.

### 5.5 Read Receipt Flow

```mermaid
sequenceDiagram
    participant Client as Reader's Client
    participant Controller as conversations.controller.ts
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher.ts
    participant Room as Conversation Room
    participant Sender as Sender's Client

    Note over Client: User opens conversation / scrolls
    Client->>Controller: PATCH /conversations/{id}/read { messageId }

    Controller->>Controller: validate message exists & belongs to conversation
    Controller->>DB: update ConversationMember.lastReadMessageId
    DB-->>Controller: success

    Controller->>Dispatcher: dispatchMessageRead(conversationId, { conversationId, userId, lastReadMessageId })
    Dispatcher->>Room: io.to("conversation:{id}").emit("message:read", payload)

    Room-->>Sender: "message:read" { conversationId, userId, lastReadMessageId }
    Sender->>Sender: update TanStack Query cache (both list + single conversation)
    Sender->>Sender: re-render MessageStatus (CheckCheck icon)
```

**Client-side handling** (`useConversationSocket.ts`): Updates both `queryKeys.conversations` (list) and `queryKeys.conversation(conversationId)` (single) in the TanStack Query cache by mapping `members` to update `lastReadMessageId` for the reader.

The global handler (`conversation.handlers.ts`) also handles `message:read` to optionally reset `unreadCount` if the reader is the current user.

---

## 6. Presence Flow

### 6.1 Architecture

The presence system uses `PresenceStore` (`server/src/socket/presenceStore.ts`) — a singleton with a **dual-write strategy**:

- **Always writes to in-memory Map** (fast, always works)
- **Best-effort writes to Upstash Redis** (persistent, cross-instance)
- **Reads prefer Redis, fall back to in-memory**

```mermaid
flowchart LR
    subgraph PresenceStore["presenceStore.ts"]
        Add["addSocket(userId, socketId)"]
        Remove["removeSocket(userId, socketId)"]
        MemMap["In-Memory Map\nuserId → Set<socketId>"]
        RedisOp["Redis Operations\nSADD / SREM / SMEMBERS"]
    end

    Add --> MemMap
    Add --> RedisOp
    Remove --> MemMap
    Remove --> RedisOp

    MemMap -->|isFirst?| DispatchOnline["dispatchUserPresence ONLINE"]
    MemMap -->|isNowOffline?| DispatchOffline["dispatchUserPresence OFFLINE"]
    Add -->|getOnlineUsers| DispatchInitial["dispatchUserPresence INITIAL"]
```

### 6.2 Connect/Disconnect Flow

```mermaid
sequenceDiagram
    participant Client as Client Socket
    participant Presence as presence.handler.ts
    participant Store as presenceStore.ts
    participant Redis as Upstash Redis
    participant Dispatcher as socket.dispatcher.ts
    participant Others as Other Clients

    Note over Client,Others: CONNECTION
    Client->>Presence: socket connected

    Presence->>Presence: attach disconnect handler FIRST

    Presence->>Store: addSocket(userId, socketId)
    Store->>Store: memoryAddSocket → isFirst?
    Store->>Redis: SADD user:presence:{userId} {socketId}
    Store->>Redis: SADD presence:users {userId}
    Store-->>Presence: isFirstConnection

    alt isFirstConnection === true
        Presence->>Dispatcher: dispatchUserPresence("ONLINE", userId, socket)
        Dispatcher->>Others: socket.broadcast.emit("user:online", { userId })
    end

    Presence->>Store: getOnlineUsers()
    Store->>Redis: SMEMBERS presence:users
    Store-->>Presence: [userId, ...]

    Presence->>Dispatcher: dispatchUserPresence("INITIAL", onlineUsers, socket)
    Dispatcher->>Client: socket.emit("presence:initial", { userIds: [...] })

    Note over Client,Others: DISCONNECTION
    Client->>Client: disconnect (e.g., tab closed)
    Client->>Presence: "disconnect" event fires

    Presence->>Store: removeSocket(userId, socketId)
    Store->>Store: memoryRemoveSocket → isNowOffline?
    Store->>Redis: SREM user:presence:{userId} {socketId}

    alt isNowOffline === true
        Store->>Redis: DEL user:presence:{userId}
        Store->>Redis: SREM presence:users {userId}
        Store->>Redis: SET user:lastSeen:{userId} {timestamp}
        Store-->>Presence: isNowOffline = true
        Presence->>Dispatcher: dispatchUserPresence("OFFLINE", userId)
        Dispatcher->>Others: io.emit("user:offline", { userId })
    end
```

### 6.3 Client-Side Presence

Presence state is managed by `useChatStore` (Zustand):

```typescript
// Store state
onlineUsers: Set<string>  // Set of userIds currently online

// Actions
setInitialOnlineUsers: (users: string[]) => void  // From "presence:initial"
addUserOnline: (userId: string) => void            // From "user:online"
removeUserOffline: (userId: string) => void        // From "user:offline"
```

**Components consuming presence:**
- `SocketProvider.tsx` — registers listeners for `presence:initial`, `user:online`, `user:offline`
- `PresenceIndicator.tsx` — renders green/gray dot based on `onlineUsers.has(userId)`
- `usePresence` hook (in `client/src/modules/users/hooks/usePresence.ts`) — *reserved for future use*

---

## 7. Conversation Update Flow

The `conversation:update` event is a **decoupled metadata event** that the server emits whenever conversation-level information changes. The client does **not** infer this metadata from `message:*` events.

### Trigger Points

| Trigger | Source | `conversation:update` Payload |
|---|---|---|
| New message created | `messages.service.ts` (via `$transaction`) | `{ id, name, updatedAt, latestMessageId, latestMessage }` |
| Message edited | `messages.service.ts` (if editing the latest message) | `{ id, name, updatedAt, latestMessageId, latestMessage }` |
| Message deleted | `messages.service.ts` (if deleting the latest message) | `{ id, name, updatedAt, latestMessageId, latestMessage }` |
| Invite accepted (member joined) | `invites.controller.ts` | `{ id, updatedAt }` |

### Client-Side Handling

The global event router (`conversation.handlers.ts` → `handleConversationUpdate`) updates the sidebar list:

```typescript
// Updates conversation in cache with new metadata
queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (oldData) => {
  // Maps over conversations, replaces matching conversation
  // Then sorts by updatedAt descending
});
```

---

## 8. Invite System Socket Events

When an invite is resolved (`POST /api/invites/resolve`), the server may emit socket events depending on the invite type:

### 8.1 User Invite (DM Creation)

```mermaid
sequenceDiagram
    participant Acceptor as Invite Acceptor
    participant InviteCtrl as invites.controller.ts
    participant Service as invites.service.ts
    participant Resolver as userResolver.ts
    participant ConvService as conversations.service.ts
    participant Dispatcher as socket.dispatcher.ts
    participant Sender as Invite Creator

    Acceptor->>InviteCtrl: POST /api/invites/resolve { token }

    InviteCtrl->>Service: resolveInviteService({ token, userId })
    Service->>Resolver: userInviteResolver.resolve()
    Resolver->>ConvService: createOrGetDM(actorId, invite.entityId)
    ConvService-->>Resolver: { conversation, created: true }
    Resolver-->>Service: { redirectUrl, consumed: true, events: [{ type: "CONVERSATION_NEW", payload: conversation }] }
    Service-->>InviteCtrl: { redirectUrl, events }

    InviteCtrl->>Dispatcher: dispatchConversationNew(conversation)
    Dispatcher->>Sender: socket.join("conversation:{id}")
    Dispatcher->>Sender: io.to("user:{id}").emit("conversation:new", conversation)
```

### 8.2 Conversation Invite (Group Membership)

```mermaid
sequenceDiagram
    participant Acceptor as Invite Acceptor
    participant InviteCtrl as invites.controller.ts
    participant Service as invites.service.ts
    participant Resolver as conversationResolver.ts
    participant DB as PostgreSQL
    participant IO as Socket.io Server
    participant Members as Existing Members

    Acceptor->>InviteCtrl: POST /api/invites/resolve { token }

    InviteCtrl->>Service: resolveInviteService({ token, userId })
    Service->>Resolver: conversationInviteResolver.resolve()
    Resolver->>DB: tx.conversationMember.create(...)
    DB-->>Resolver: success (or P2002 if already member)
    Resolver-->>Service: { events: [{ type: "CONVERSATION_UPDATE", conversationId }] }
    Service-->>InviteCtrl: { redirectUrl, events }

    InviteCtrl->>IO: io.to("conversation:{id}").emit("CONVERSATION_UPDATE", { ... })
    IO-->>Members: "conversation:update" with { conversationId, userId, conversation: { id, updatedAt } }
```

---

## 9. Dispatcher Architecture

The `socket.dispatcher.ts` module provides typed helpers for emitting socket events. It centralizes emission logic that is called from both socket handlers and HTTP controllers.

```mermaid
classDiagram
    class SocketDispatcher {
        +dispatchConversationNew(conversation) void
        +dispatchMessageEvent(action, conversationId, message, conversationMetadata?) void
        +dispatchMessageRead(conversationId, payload) void
        +dispatchUserPresence(action, userIdOrIds, targetSocket?) void
    }

    class MessageHandler {
        +registerMessageHandlers(io, socket) void
    }

    class PresenceHandler {
        +registerPresenceHandlers(io, socket) void
    }

    class MessagesController {
        +getMessages() void
        +createMessage() void
        +updateMessage() void
        +deleteMessage() void
    }

    class ConversationsController {
        +getConversations() void
        +createConversation() void
        +markConversationAsRead() void
    }

    class InvitesController {
        +resolveInvite() void
        +generateInvite() void
    }

    SocketDispatcher <-- MessageHandler : calls
    SocketDispatcher <-- PresenceHandler : calls
    SocketDispatcher <-- MessagesController : calls
    SocketDispatcher <-- ConversationsController : calls
    SocketDispatcher <-- InvitesController : calls
```

---

## 10. Socket Middleware

### 10.1 Auth Middleware (`server/src/socket/middlewares/auth.ts`)

- Extracts JWT from `handshake.auth.token`, `handshake.headers.authorization`, or `handshake.query.token`
- Verifies using local ES256 JWKS crypto (zero network calls)
- On success: populates `socket.data.user` with the decoded user
- On failure: returns a typed error (`TOKEN_MISSING`, `TOKEN_INVALID`, `AUTH_SERVICE_ERROR`)

### 10.2 Rate Limiter (`server/src/socket/middlewares/rateLimiter.ts`)

- Per-user in-memory rate limiting (no Redis sync)
- Only applies to the `message:send` event
- **Limits:** 10 messages per 10-second window
- **Action:** Drops the packet and returns an error to the callback

---

## 11. Known Issues & Technical Debt

| Issue | Description | Impact |
|---|---|---|
| **No Redis Pub/Sub Adapter** | Socket.io is not configured with a Redis adapter. The presence store's in-memory fallback prevents horizontal scaling. | Multiple backend instances would fragment presence state. |
| **Overloaded Controllers** | `messages.controller.ts` and `conversations.controller.ts` directly import and call socket dispatchers, mixing HTTP and WebSocket concerns. | Makes testing harder and couples REST logic to socket infrastructure. |
| **TYPING events not implemented** | `typing:start` and `typing:stop` are defined but have no handlers. | Feature gap — users cannot see typing indicators. |
| **Invite socket events use string literals** | `invites.controller.ts` emits `"CONVERSATION_UPDATE"` as a raw string rather than using `SOCKET_EVENTS.CONVERSATION_UPDATE`. | Fragile — renaming the constant won't update this emission. |

---

## 12. File Reference

| File | Role |
|---|---|
| `server/src/shared/socket-events.ts` | Event name constants and shared types |
| `server/src/socket/socket.ts` | Server initialization, auth middleware, room joining, handler registration |
| `server/src/socket/socket.dispatcher.ts` | Typed emitter helpers for all socket events |
| `server/src/socket/socketErrors.ts` | Error code constants |
| `server/src/socket/handlers/message.handler.ts` | Handles `message:send` from clients |
| `server/src/socket/handlers/presence.handler.ts` | Handles connect/disconnect for presence |
| `server/src/socket/middlewares/auth.ts` | JWT verification on socket handshake |
| `server/src/socket/middlewares/rateLimiter.ts` | Rate limiter for `message:send` |
| `server/src/socket/presenceStore.ts` | Redis + in-memory presence store |
| `server/src/modules/messages/messages.controller.ts` | REST controller that dispatches socket events |
| `server/src/modules/conversations/conversations.controller.ts` | REST controller that dispatches socket events |
| `server/src/modules/invites/invites.controller.ts` | REST controller that dispatches socket events |
| `client/src/shared/lib/socket.ts` | Socket.io client singleton |
| `client/src/shared/providers/socket-provider.tsx` | Connection lifecycle + presence listeners |
| `client/src/modules/chat/hooks/useConversationSocket.ts` | Active conversation socket listeners |
| `client/src/modules/chat/hooks/useGlobalSocket.ts` | Global socket listeners (sidebar) |
| `client/src/modules/chat/realtime/index.ts` | Event router factory |
| `client/src/modules/chat/realtime/conversation.handlers.ts` | Handlers for conversation-level socket events |
| `client/src/modules/chat/realtime/message.handlers.ts` | Handlers for message-level socket events |
| `client/src/modules/chat/store/chatStore.ts` | Zustand store for socket status + online users |
| `client/src/modules/chat/types/socket.ts` | Socket payload TypeScript interfaces |
| `client/src/modules/chat/utils/cacheHelpers.ts` | Helper functions for TanStack Query cache updates |
