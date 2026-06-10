# Application Data Flow

This document outlines the high-level data flow of the Nexus application, specifically focusing on the most critical path: **Sending and Receiving a Real-Time Message**.

## Real-Time Messaging Flow

When a user sends a message in a conversation, the data follows a specific path through the client, server, database, and back to connected clients via WebSockets.

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant Sender as Client (Sender)
    participant API as Server (REST API)
    participant DB as Database (Prisma)
    participant SocketServer as Server (Socket.io)
    participant Receiver as Client (Receiver)

    Note over Sender,API: 1. User Action
    Sender->>API: POST /api/messages (conversationId, content)
    
    Note over API,DB: 2. Persistence
    API->>DB: Save Message to DB
    DB-->>API: Return created Message record
    
    Note over API,SocketServer: 3. Internal Event Trigger
    API->>SocketServer: Emit Internal Event (NEW_MESSAGE)
    
    Note over SocketServer,Receiver: 4. Real-time Fanout
    SocketServer->>Receiver: Socket Event `message:new` (Message payload)
    
    Note over Receiver: 5. State Update
    Receiver->>Receiver: Zustand / React State Update
    Receiver->>Receiver: Re-render Chat UI
```

### Flow Breakdown

1. **User Action**: The sender submits a message via the chat UI. The frontend (`client/src/modules/chat`) makes an HTTP POST request to the backend's `/api/messages` endpoint containing the message text and conversation ID.
2. **Persistence**: The backend (`server/src/modules/messages/messages.controller.ts`) validates the request and uses Prisma to save the message directly into the database.
3. **Internal Event Trigger**: Once successfully saved, the backend controller triggers the Socket.io service or an internal event emitter to broadcast the new message.
4. **Real-time Fanout**: The Socket.io server identifies all connected clients that are participants in the conversation (except the sender) and emits a `message:new` socket event containing the saved message data.
5. **State Update**: The receiving client listens for `message:new` via `socket.on()`. Upon receiving the payload, it pushes the new message into the local state store (e.g., Zustand or React Context). The UI re-renders chronologically to display the new message bubble.

## Authentication Data Flow

When a user logs in, the flow manages session state across the client and server.

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Database

    Client->>Server: POST /api/auth/login (email, password)
    Server->>Database: Verify credentials
    Database-->>Server: User record
    Server-->>Client: Return JWT Token / Set HttpOnly Cookie
    Client->>Client: Store session metadata (Zustand)
    Client->>Server: Subsequent requests include Token/Cookie
```


> **Note:** Documentation updated on 2026-06-10 to reflect UI improvements: feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
