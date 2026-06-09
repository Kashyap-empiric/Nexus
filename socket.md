# Socket.io Integration — Nexus Chat

## Overview

Nexus uses **Socket.io** as the real-time communication layer for its chat application. It enables:

- Instant message delivery and fan-out to conversation participants
- User online/offline presence tracking (backed by Redis)
- Read receipts (message read status)
- Optimistic UI updates with real-time confirmation
- Room-based broadcasting scoped to conversations

The stack:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server | `socket.io` (v4.8.3) on Node.js + Express + Prisma | Realtime engine, room management, persistence |
| Client | `socket.io-client` (v4.8.3) on Next.js | Browser websocket connection, event handlers |
| Auth | Supabase Auth + `jose` JWKS verification | JWT-based socket authentication |
| Presence | Redis (via `redis` npm package) | Distributed presence state across server instances |
| State | Zustand + TanStack React Query | Client-side state management & cache invalidation |

---

## Project Structure

### Server-Side (`server/src/socket/`)

```
server/src/socket/
├── socket.ts                 # Main init: server setup, CORS, room auto-join
├── socketErrors.ts           # Auth error code constants
├── middlewares/
│   ├── auth.ts               # JWT verification middleware
│   └── rateLimiter.ts        # Per-user message rate limiting
└── handlers/
    ├── presence.handler.ts   # Online/offline broadcast + Redis orchestration
    └── message.handler.ts    # Message send → persist → fan-out
```

Shared constants (used by both server and client):

```
server/src/shared/socket-events.ts   # Event name constants & payload interfaces
```

### Client-Side (`client/src/`)

```
client/src/
├── shared/
│   ├── lib/socket.ts               # Socket.io client singleton (auto-connect disabled)
│   ├── providers/socket-provider.tsx # React provider: connect lifecycle + status
│   └── socket-events.ts            # Mirrored event name constants
└── modules/
    ├── chat/
    │   ├── hooks/
    │   │   ├── useGlobalSocket.ts         # Global event listeners (sidebar scope)
    │   │   ├── useConversationSocket.ts   # Per-conversation event listeners
    │   │   └── useMessages.ts            # Send mutation + optimistic updates
    │   ├── realtime/
    │   │   ├── index.ts                  # Event router factory
    │   │   ├── message.handlers.ts       # Handle message:new events
    │   │   └── conversation.handlers.ts  # Handle message:read events
    │   ├── store/chatStore.ts            # Zustand store (socket status, online users)
    │   └── types/socket.ts              # TypeScript types for socket payloads
    └── users/
        └── hooks/usePresence.ts         # Presence event listeners
```

---

## Socket Events — Complete Reference

All event names are defined in `server/src/shared/socket-events.ts` and mirrored exactly in `client/src/shared/socket-events.ts`.

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `message:send` | Client → Server | `{ tempId, conversationId, content }` | Send a new message (with callback ack) |
| `message:new` | Server → Client(s) | `Message` object | New message broadcast to conversation room |
| `message:read` | Server → Client(s) | `{ conversationId, userId, lastReadMessageId }` | Read receipt broadcast |
| `conversation:new` | Server → Client(s) | `Conversation` object | New conversation available for a user (sent to `user:<userId>` room) |
| `user:online` | Server → Client(s) | `{ userId }` | User came online (broadcast, not self) |
| `user:offline` | Server → Client(s) | `{ userId }` | User went offline (broadcast, not self) |
| `presence:initial` | Server → Client | `{ userIds: string[] }` | Initial snapshot of all online users |
| `typing:start` | _(reserved)_ | — | Typing indicator start |
| `typing:stop` | _(reserved)_ | — | Typing indicator stop |

---

## Server Architecture

### 1. Initialization (`socket.ts`)

The socket server is initialized in `server/src/server.ts` via:

```ts
const httpServer = http.createServer(app);
httpServer.listen(PORT);
initSocket(httpServer);
```

**`initSocket(httpServer)` does:**

1. Creates a new Socket.io `Server` instance with CORS configured from `ENV.ALLOWED_ORIGINS`
2. Registers the **JWT auth middleware** (`io.use(socketAuthMiddleware)`)
3. On each connection:
   - Registers a **per-socket rate limiter** middleware
   - Logs connection/disconnection with user ID
   - Joins the socket to a **user-specific room** (`user:<userId>`) — enables server-side targeted messaging to individual users
   - **Auto-joins** the socket to all conversation rooms the user belongs to (queried from Prisma via `conversationMember`)
   - Stores session metadata on `socket.data.session`
   - Registers **presence handlers** and **message handlers**

**Room naming conventions:**
- `conversation:<conversationId>` — Room for broadcasting to all participants of a conversation (messages, read receipts)
- `user:<userId>` — User-specific room for targeted server-to-client messages (e.g., new conversation notifications)

```ts
// Room auto-join logic
const memberships = await prisma.conversationMember.findMany({
  where: { userId },
  select: { conversationId: true },
});
const rooms = memberships.map((m) => `conversation:${m.conversationId}`);
await socket.join(rooms);
```

### 2. Auth Middleware (`middlewares/auth.ts`)

Runs on every socket connection attempt. Extracts a JWT from one of three sources:

1. `socket.handshake.auth.token` — set by the client's `auth` callback (preferred)
2. `Authorization: Bearer <token>` header
3. `socket.handshake.query.token` — URL query parameter (fallback)

Uses the `jose` library to verify the token against Supabase's JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`).

On verification, `socket.data.user` is set to `{ id: payload.sub }` (the Supabase user UUID).

**Error codes** (defined in `socketErrors.ts`):

| Code | Meaning | Retryable |
|------|---------|-----------|
| `TOKEN_MISSING` | No token provided | No |
| `TOKEN_INVALID` | Token malformed or expired | No |
| `AUTH_SERVICE_ERROR` | JWKS fetch or other error | Yes |

### 3. Rate Limiter (`middlewares/rateLimiter.ts`)

A per-socket middleware that only applies to the `message:send` event. Uses an in-memory `Map<string, { count, resetAt }>` keyed by `userId`.

- **Window:** 10 seconds
- **Limit:** 10 messages per window
- **On breach:** Calls the packet's callback with an error message and drops the packet

> ⚠️ This is an in-memory store, so it does NOT persist across server restarts or scale across multiple instances. For production multi-instance deployments, replace with Redis-backed rate limiting.

### 4. Presence Handler (`handlers/presence.handler.ts`)

Uses **Redis sets** to track user presence across potentially multiple server instances and multiple socket connections per user.

**Redis keys:**

| Key | Type | Purpose |
|-----|------|---------|
| `user:presence:<userId>` | Set (socket IDs) | Track all socket connections for a user |
| `presence:users` | Set (user IDs) | Global set of all currently online users |
| `user:lastSeen:<userId>` | String (timestamp) | Last disconnect timestamp |

**Connection flow:**

1. **On connect:** Add socket ID to `user:presence:<userId>`, add user ID to `presence:users`
2. If user was newly added to `presence:users` (first connection for this user), broadcast `user:online` to all other sockets
3. Send `presence:initial` to the connecting socket with the full list of online user IDs

**Disconnection flow:**

1. Remove socket ID from `user:presence:<userId>`
2. If no more socket IDs remain for that user (cardinality = 0):
   - Delete `user:presence:<userId>`
   - Remove user from `presence:users`
   - Broadcast `user:offline` to all other sockets
   - Set `user:lastSeen:<userId>` to current timestamp

This design handles **multiple tabs** (multiple sockets per user) gracefully — a user only appears offline when ALL their sockets disconnect.

### 5. Message Handler (`handlers/message.handler.ts`)

Listens for `message:send` events. The flow:

1. **Validate** — Check `userId` and payload fields (`content`, `conversationId`)
2. **Persist** — Call `createMessage()` service (writes to Postgres via Prisma)
3. **Fan-out** — Emit `message:new` to the `conversation:<conversationId>` room
4. **Acknowledge** — Return `{ success: true, data: { tempId, message } }` to the sender via callback

**Error responses** (returned via callback):

| Error Code | Condition | Retryable |
|------------|-----------|-----------|
| `UNAUTHORIZED` | No userId in socket.data | No |
| `INVALID_PAYLOAD` | Missing content or conversationId | No |
| `MESSAGE_SEND_FAILED` | Service/database error | Yes |

### 6. HTTP Fallback to Socket Emit

Additionally, two HTTP endpoints emit socket events as a **fallback** mechanism (in `messages.controller.ts` and `conversations.controller.ts`):

- `POST /api/conversations/:conversationId/messages` — Creates a message via HTTP, then emits `message:new` to the socket room
- `PATCH /api/conversations/:id/read` — Marks conversation as read via HTTP, then emits `message:read` to the socket room

These use dynamic imports (`getIO` + `SOCKET_EVENTS`) to avoid circular dependencies.

---

## Client Architecture

### 1. Socket Client Singleton (`shared/lib/socket.ts`)

```ts
import { io } from "socket.io-client";

const SOCKET_URL = ENV.API_URL.replace("/api", "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,           // Manual connection control
  auth: async (cb) => {
    const { data: { session } } = await supabase.auth.getSession();
    cb({ token: session?.access_token });
  },
});
```

Key design decisions:
- **`autoConnect: false`** — The socket provider controls when to connect
- **Dynamic auth callback** — Fetches the latest Supabase session token each time a connection (or reconnection) occurs
- **Singleton pattern** — Single socket instance shared across the app

### 2. Socket Provider (`shared/providers/socket-provider.tsx`)

Mounted in the protected layout (`app/(protected)/layout.tsx`). It:

1. **Connects** the socket on mount (if not already connected)
2. **Listens** to `connect`, `disconnect`, and `connect_error` lifecycle events
3. **Updates Zustand store** with the current connection status
4. **Shows toast** on connection errors
5. **Cleans up** event listeners on unmount

```tsx
// Usage: Mounted once in the protected layout
<SocketProvider />
```

### 3. Socket Status (Zustand Store)

The `chatStore` tracks:
- `socketStatus`: `"connecting" | "connected" | "disconnected"`
- `onlineUsers`: `Set<string>` — user IDs currently online
- `activeConversationId`: Currently active conversation
- `drafts`: Per-conversation message drafts

### 4. Event Listener Hooks

#### `useGlobalSocket()` — Sidebar-level events

Mounted in `Sidebar.tsx`. Registers global listeners for:
- `message:new` → Updates sidebar conversation list (latest message preview, reorder)
- `message:read` → Updates read receipts in sidebar

Uses the **event router** pattern (`realtime/index.ts`) to decouple event handling from the hook:

```ts
const router = createChatEventRouter(queryClient);
// router.messageNew = handleMessageNew(queryClient)
// router.messageRead = handleMessageRead(queryClient)
```

#### `useConversationSocket(conversationId)` — Conversation-level events

Mounted in `ActiveConversation.tsx`. Registers listeners scoped to a specific conversation:

- **`message:new`** → Appends new message to the infinite query cache (replaces optimistic message by `tempId` if matched)
- **`message:read`** → Updates read receipts for the conversation (both in the conversations list and the single conversation cache)

This hook handles message **deduplication** — it checks if an optimistic message already exists in the cache before appending.

#### `useMessages(conversationId)` — Send message mutation

This is where the **send** flow lives. The `useSendMessageMutation` hook:

1. **`onMutate`** — Immediately inserts an optimistic message into the query cache (with `pending: true`)
2. **`mutationFn`** — Emits `message:send` over the socket with `{ conversationId, content, tempId }` and waits for the callback acknowledgement
3. **`onSuccess`** — Replaces the optimistic message with the real message from the server
4. **`onError`** — Reverts to the previous cache state and shows an error toast

#### `usePresence()` — Presence listeners

Mounted at the app level. Listens for:
- `presence:initial` → Sets the initial online users set in Zustand
- `user:online` → Adds a user to the online set
- `user:offline` → Removes a user from the online set

### 5. Event Handlers (`realtime/`)

#### `message.handlers.ts` — `handleMessageNew`

When a new message arrives:
1. Updates the conversations list cache (sets `updatedAt` to now, adds message preview)
2. Sets a browser tab badge `(1) New Message!` when the tab is hidden

#### `conversation.handlers.ts` — `handleMessageRead`

When a read receipt arrives:
1. Updates the `lastReadMessageId` on the appropriate conversation member in the conversations list cache

---

## End-to-End Message Flow

```
[SENDER CLIENT]                 [SERVER]                     [RECEIVER CLIENT(S)]
      │                           │                                │
      │  emit("message:send",     │                                │
      │   {tempId, convId,        │                                │
      │    content})               │                                │
      ├──────────────────────────►│                                │
      │                           │  Rate limiter check            │
      │                           │  Auth check (already done      │
      │                           │    at connection)              │
      │                           │  Validate payload              │
      │                           │  createMessage() → DB          │
      │                           │                                │
      │  callback({ success:      │                                │
      │   true, data: {           │                                │
      │    tempId, message }})    │                                │
      │◄──────────────────────────┤                                │
      │                           │                                │
      │  Replace optimistic       │  emit("message:new",           │
      │  message with real        │   messageObject)               │
      │  message                  │  to room "conversation:xxx"    │
      │                           ├───────────────────────────────►│
      │                           │                                │
      │                           │                                │  Query cache update
      │                           │                                │  (append message or
      │                           │                                │   replace optimistic)
```

### Optimistic Update Strategy

1. **Immediate UI:** Sender sees the message instantly with `pending: true`
2. **Socket send:** `message:send` event emitted with a `tempId` (UUIDv7)
3. **Acknowledgement:** Server responds with the persisted message (including real DB `id`)
4. **Swap:** Client replaces the optimistic message (matched by `tempId`) with the real message
5. **Fan-out:** Server also broadcasts to all other participants via `message:new`
6. **Error:** On failure, the optimistic message is rolled back and a toast is shown

---

## Presence Flow

```
[USER A CONNECTS]              [SERVER]                    [USER B (already connected)]
      │                           │                                │
      │  Socket connection         │                                │
      │  with JWT token            │                                │
      ├──────────────────────────►│                                │
      │                           │  Verify JWT                    │
      │                           │  Auto-join rooms               │
      │                           │  Add to presence sets (Redis)  │
      │                           │                                │
      │  emit("presence:initial", │                                │
      │   {userIds: [...]})       │                                │
      │◄──────────────────────────┤                                │
      │                           │                                │
      │                           │  emit("user:online",           │
      │                           │   {userId: A})                 │
      │                           ├───────────────────────────────►│
      │                           │                                │  Add A to onlineUsers set
```

---

## Error Handling Strategy

### Server-Side Error Handling

- **Auth middleware** — Returns typed error codes (`TOKEN_MISSING`, `TOKEN_INVALID`, `AUTH_SERVICE_ERROR`) via `next(err)` with a custom `Error.code` property
- **Rate limiter** — Calls the callback with `{ error: "You are sending messages too quickly..." }` and drops the packet
- **Message handler** — Returns structured error objects via callback:
  ```ts
  { success: false, error: { code: string, message: string, retryable: boolean } }
  ```
- **Runtime errors** — Socket-level `"error"` event is logged

### Client-Side Error Handling

- **Connection errors** — `SocketProvider` shows a toast with the error message
- **Rate limit errors** — Dedicated red toast with warning icon
- **Send failures** — Optimistic message rolled back, toast shown
- **Socket status** — Exposed via Zustand (`socketStatus`) — can be used for UI indicators

---

## Configuration

### Server (environment variables)

```env
CLIENT_URL=http://localhost:3001    # Used for CORS (comma-separated allowed)
REDIS_URL=redis://localhost:6379     # Redis connection for presence
PORT=4000                            # Server port
SUPABASE_URL=                        # Supabase project URL
```

### Client (environment variables)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api   # The socket client derives the
                                                # server URL by stripping "/api"
```

### CORS

The server parses `CLIENT_URL` as a comma-separated list and applies each origin. Socket.io CORS is configured in `initSocket()` and Express CORS in `app.use(cors(...))`.

---

## Dependencies

| Package | Server | Client | Purpose |
|---------|--------|--------|---------|
| `socket.io` | v4.8.3 | — | Server-side WebSocket engine |
| `socket.io-client` | — | v4.8.3 | Client-side WebSocket library |
| `redis` | v6.0.0 | — | Redis client for presence |
| `jose` | v6.2.3 | — | JWT verification (JWKS) |
| `zustand` | — | v5.0.14 | Client state management |
| `@tanstack/react-query` | — | v5.101.0 | Server state & cache management |

---

## Scaling Considerations

### Multi-Instance Deployment

The **presence system** already supports multiple server instances because it uses **Redis** as the backing store — all instances share the same Redis presence data.

The **rate limiter** is in-memory only. For multi-instance deployments, it should be replaced with a Redis-based counter (e.g., using the same Redis instance).

### Room Membership

Room membership is **freshly queried from the database** on each socket connection (`conversationMember` table). 

#### Dynamic Room Joining

When a **new conversation is created** (e.g., DM), the server doesn't rely on reconnection. Instead, the `createConversation` controller handler:

1. **Iterates** through all connected sockets (`io.sockets.sockets`) to find sockets belonging to each participant
2. **Calls `socket.join()`** on each active socket to join them to the new `conversation:<id>` room
3. **Emits `conversation:new`** to each participant's `user:<userId>` room with the full conversation object

**Client-side handling:**
- The `useGlobalSocket` hook listens for `conversation:new`
- The `handleConversationNew` handler prepends the conversation to the sidebar's query cache (deduplicating by ID)
- The new conversation appears in the sidebar instantly without a page refresh

**Multi-instance limitation:** The current implementation uses `io.sockets.sockets` which is local to the current process. For multi-instance deployments, an alternative approach (e.g., emitting a `room:join` event to the user room for client-side processing) would be needed.

---

## TypeScript Types

### Server ↔ Client Shared Payloads

```ts
// From shared/socket-events.ts
interface MessageReadPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
}

interface InitialPresencePayload {
  userIds: string[];
}
```

### Client Socket Types

```ts
// From types/socket.ts
interface SocketResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: T;
  data?: T;
}

interface MessageSendPayload {
  conversationId: string;
  content: string;
  tempId: string;
}

interface MessageReadPayload {
  conversationId: string;
  lastReadMessageId: string;
  userId: string;
}
```

---

## Summary of Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Singleton socket client** | Single WebSocket connection per browser tab; events are filtered/ignored based on active conversation |
| **Room-based fan-out** | Only participants in a conversation receive its messages (vs. broadcasting to all connected clients) |
| **User-specific rooms (`user:<userId>`)** | Enables targeted server-to-client messaging (e.g., new conversation notification) without broadcasting to all |
| **Dynamic room joining** | New conversations trigger `socket.join()` on participants' active sockets — no reconnection needed |
| **Auth via handshake callback** | Uses `auth` function that fetches the latest Supabase session — supports token refresh |
| **Optimistic updates via query cache** | Messages appear instantly; matched by `tempId` and replaced when server confirms |
| **Redis for presence** | Enables cross-instance presence tracking; handles multi-tab connections per user |
| **Dual socket + HTTP emit** | HTTP endpoints (create message, mark read) also emit socket events as a fallback — ensures consistency |
| **autoConnect: false** | The app controls when to connect the socket (after auth is confirmed in the protected layout) |
