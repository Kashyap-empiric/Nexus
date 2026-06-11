# Application Data Flow

This document outlines the high-level data flow of the Nexus application, focusing on the most critical paths: **Real-Time Messaging**, **Presence**, and **Read Receipts**.

> For comprehensive socket-specific documentation including all event flows, room strategy, and presence architecture, see [socket.md](../socket.md).

## Overall Communication Architecture

```mermaid
flowchart TB
    subgraph Client["Next.js Client"]
        REST["REST API Calls\n(TanStack Query)"]
        WS["WebSocket Events\n(Socket.io)"]
    end

    subgraph Server["Express Server"]
        HTTP["HTTP Routes\n(controllers)"]
        SOCKET["Socket.io Server\n(handlers + dispatcher)"]
        STORE["Presence Store\n(Redis + In-Memory)"]
    end

    subgraph DB["Data Layer"]
        PG["PostgreSQL\n(Prisma)"]
        REDIS["Upstash Redis\n(Presence)"]
    end

    REST --> HTTP
    HTTP --> PG
    HTTP --> SOCKET
    WS <--> SOCKET
    SOCKET --> STORE
    STORE <--> REDIS
    SOCKET --> PG
```

## Real-Time Messaging Flow

When a user sends a message in a conversation, the data follows a specific path through the client, server, database, and back to connected clients via WebSockets.

### Primary Flow (Socket.io)

```mermaid
sequenceDiagram
    participant Sender as Client (Sender)
    participant Socket as Socket.io Client
    participant Handler as Server (message.handler)
    participant DB as PostgreSQL (Prisma)
    participant Dispatcher as socket.dispatcher
    participant Receiver as Client (Receiver)

    Note over Sender,Receiver: 1. User sends message
    Sender->>Socket: emit("message:send", { tempId, conversationId, content })
    Note over Sender: Optimistic update: show pending message

    Note over Handler,DB: 2. Server persists
    Handler->>DB: createMessage (Prisma $transaction)

    Note over DB: Atomically:
    Note over DB: • Create message (UUIDv7)
    Note over DB: • Update conversation updatedAt + latestMessageId
    Note over DB: • Update sender's lastReadMessageId

    DB-->>Handler: { message, conversationMetadata }

    Note over Handler,Dispatcher: 3. Server broadcasts
    Handler->>Dispatcher: dispatchMessageEvent("NEW", ...)
    Dispatcher->>Receiver: "message:new" (Message payload)
    Dispatcher->>Receiver: "conversation:update" (metadata)

    Note over Sender: 4. Server acknowledges
    Handler-->>Socket: callback({ success: true, data: message })
    Sender->>Sender: Replace optimistic message with real message
```

### Fallback Flow (REST)

```mermaid
sequenceDiagram
    participant Sender as Client (Sender)
    participant API as Server (REST API)
    participant DB as PostgreSQL (Prisma)
    participant Dispatcher as socket.dispatcher
    participant Receiver as Client (Receiver)

    Sender->>API: POST /conversations/{id}/messages
    API->>DB: createMessage (Prisma $transaction)
    DB-->>API: { message, conversationMetadata }
    API->>Dispatcher: dispatchMessageEvent("NEW", ...)
    Dispatcher->>Receiver: "message:new" (Message)
    Dispatcher->>Receiver: "conversation:update" (metadata)
    API-->>Sender: 201 { data: message }
```

## Presence Flow

```mermaid
sequenceDiagram
    participant UserA as User A (Socket)
    participant Server as Socket.io Server
    participant Store as PresenceStore
    participant Redis as Upstash Redis
    participant UserB as User B (Socket)

    Note over UserA,UserB: User A connects

    UserA->>Server: connect (JWT)
    Server->>Store: addSocket(userA, socketId)

    Store->>Store: isFirstConnection? → yes
    Store->>Redis: SADD user:presence:{userA} {socketId}

    Server->>UserB: broadcast "user:online" { userId: userA }

    Store->>Redis: SMEMBERS presence:users
    Redis-->>Store: [userA, userB]
    Server->>UserA: "presence:initial" { userIds: [userA, userB] }

    Note over UserA,UserB: User A disconnects

    UserA->>Server: disconnect
    Server->>Store: removeSocket(userA, socketId)

    Store->>Store: isNowOffline? → yes
    Store->>Redis: DEL user:presence:{userA}
    Store->>Redis: SREM presence:users {userA}
    Store->>Redis: SET user:lastSeen:{userA} {timestamp}

    Server->>UserB: "user:offline" { userId: userA }
```

## Read Receipt Flow

```mermaid
sequenceDiagram
    participant Reader as Reader's Client
    participant API as REST API
    participant DB as PostgreSQL
    participant Dispatcher as socket.dispatcher
    participant Room as Conversation Room
    participant Sender as Sender's Client

    Reader->>API: PATCH /conversations/{id}/read { messageId }
    API->>DB: validate message exists in conversation
    API->>DB: update ConversationMember.lastReadMessageId
    DB-->>API: success

    API->>Dispatcher: dispatchMessageRead(...)
    Dispatcher->>Room: "message:read" { conversationId, userId, lastReadMessageId }

    Room-->>Sender: "message:read" payload
    Sender->>Sender: update TanStack Query cache
    Sender->>Sender: MessageStatus → CheckCheck icon (read)
```

## Conversation Update Flow

```mermaid
sequenceDiagram
    participant Server as Server (any trigger)
    participant Dispatcher as socket.dispatcher
    participant Room as Conversation Room
    participant Client as All Participants

    Note over Server: Trigger: message sent, edited, or deleted

    Server->>Dispatcher: dispatchMessageEvent(action, convId, message, conversationMetadata)

    alt action is NEW, UPDATE, or DELETE
        Dispatcher->>Room: "message:{action}" (message payload)
        Dispatcher->>Room: "conversation:update" { conversation: metadata }
    end

    Room-->>Client: "message:new/update/delete"
    Room-->>Client: "conversation:update" { latestMessage, updatedAt, latestMessageId }
    Client->>Client: update message cache (per conversation)
    Client->>Client: update sidebar cache + re-sort by updatedAt
```

## Complete Socket Event Catalog

For a complete listing of all socket events with payloads, sources, and client consumers, see the **Socket Events Reference** in [socket.md](../socket.md#2-socket-events-reference).

---

> **Note:** Documentation updated on 2026-06-11 to include comprehensive socket event documentation and data flow diagrams.
