# Socket Integration Bug Analysis

Covers server (`server/src/socket/`, `server/src/shared/socket-events.ts`) and client (`client/src/socket/`, `client/src/modules/*/hooks/*socket*`) socket.io code.

---

## CRITICAL BUGS

### 1. `dispatchConversationNew` Iterates ALL Connected Sockets — O(n*m) Blowup

**File:** `server/src/socket/socket.dispatcher.ts:18-28`

```typescript
for (const member of conversation.members) {
  for (const socket of io.sockets.sockets.values()) {  // ALL connected sockets
    if (socket.rooms.has(`user:${member.userId}`)) {   // linear scan per member
      await socket.join(`conversation:${conversation.id}`);
    }
  }
}
```

This iterates every connected socket for every conversation member. In a deployment with thousands of connected sockets, this is O(members × totalSockets) per new conversation. Socket.io provides `io.in(room)` and adapter-level `socketsJoin` for efficient room joins. Iterating `io.sockets.sockets.values()` manually bypasses these optimizations and adds latency proportional to total connected users on every new DM or channel creation.

### 2. Rate Limiter Map Never Cleaned Up — Memory Leak

**File:** `server/src/socket/middlewares/rateLimiter.ts:4`

```typescript
const messageRateLimits = new Map<string, { count: number; resetAt: number }>();
```

Entries are added on every `MESSAGE_SEND` event but **never removed**. A user who sends one message and never returns leaves a permanent entry in this Map. Over the lifetime of a server process, every user who has ever sent a message will have an entry, growing unboundedly. There is no TTL sweep or LRU eviction. For a long-running server, this is a slow memory leak.

### 3. Push Notification Fire-and-Forget After Callback Returns

**File:** `server/src/socket/handlers/message.handler.ts:88-128`

```typescript
dispatchMessageEvent("NEW", payload.conversationId, message, conversationMetadata);

findById(payload.conversationId).then(async (conv) => {  // async after callback
  // ... push notifications ...
  Promise.all(pushPromises).catch(...)
}).catch(...);

return callback?.({ success: true, data: message });  // callback returns
```

The `callback` at line 130 is called **before** the `findById` chain resolves. If the socket disconnects before the push notification promises settle, the `.catch` handlers silently swallow any errors. The push notifications may or may not complete — there's no guarantee or visibility. The entire chain is detached from the request lifecycle.

---

## MEDIUM BUGS

### 4. PRESENCE INITIAL Payload Shape Mismatch Causes Silent Failure

**File:** `client/src/socket/socketProvider.tsx:28-37`

```typescript
const handleInitialPresence = (payload: any) => {
  if (payload.users) {
    useSocketStore.getState().setInitialOnlineUsers(
      payload.users.map((u: any) => u.userId)  // expects array of {userId, status}
    );
  } else if (payload.userIds) {
    // Fallback for old payload
    useSocketStore.getState().setInitialOnlineUsers(payload.userIds);  // expects string[]
  }
};
```

The server sends payload as `{ users: [{ userId, status }, ...] }` (presence.handler.ts:46) with the `users` key. The client checks for `payload.users` — correct. But the "old payload" fallback checks `payload.userIds` (server socket-events.ts:28 defines `InitialPresencePayload.userIds` — with an 's'). If the server ever sends this shape, `payload.users.map(...)` at line 30 would throw on the first call because strings don't have `.userId`. The error is silently caught nowhere, and the entire `handleInitialPresence` throws, leaving the `onlineUsers` set empty.

Additionally, the server-side `socket-events.ts` defines `InitialPresencePayload.userIds: string[]`, while the actual server payload uses `users: Array<{userId, status}>`. The type definition and the runtime payload are inconsistent.

### 5. `useSocketEvents` Has Fragile Handler Identity Tracking

**File:** `client/src/socket/useSocketEvent.ts:18-31`

```typescript
export function useSocketEvents(handlers: SocketHandlerMap) {
  useEffect(() => {
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [handlers]);
}
```

The entire `handlers` object is the effect dependency. If any handler reference changes (e.g., a new closure is created), ALL handlers are removed and re-registered — not just the changed one. Between the `off` and `on` calls, no handlers are active, creating a window where events can be missed. With three consumers (`SocketProvider`, `useGlobalSocket`, `useConversationSocket`) all using this hook, a re-render in one can cascade handler re-registrations across all of them.

### 6. Duplicate Event Processing: Global + Per-Conversation Handlers for Same Events

**Files:** `client/src/modules/chat/hooks/useGlobalSocket.ts:13-24` · `client/src/modules/chat/hooks/useConversationSocket.ts:160-167`

`useGlobalSocket` registers handlers for `MESSAGE_NEW`, `MESSAGE_READ`, `MESSAGE_UPDATE`, `MESSAGE_DELETE` on the global socket. `useConversationSocket` also registers handlers for the **same events** on the same socket instance. Both hooks are mounted simultaneously (global in Sidebar, per-conversation in ActiveConversation).

For every message event, both handler sets fire. For `MESSAGE_READ`, both update the same sidebar cache — the global handler writes `lastReadMessageId`, then the per-conversation handler overwrites with the same value. Redundant but harmless for correctness. For `MESSAGE_NEW`, the global handler increments unread counts while the per-conversation handler handles message pagination — this is intentional, but the duplicate read handler is wasted work on every message read receipt.

### 7. Workspace Channel Room Names Collide with DM Room Names

**File:** `server/src/socket/socket.ts:48-58`

```typescript
const dmMemberships = await getUserConversationMemberships(userId);
const channelMemberships = await getUserWorkspaceChannels(userId);
const rooms = [
  ...dmMemberships.map((m) => `conversation:${m.conversationId}`),
  ...channelMemberships.map((c) => `conversation:${c.id}`)
];
```

Both DMs and workspace channels use the `conversation:` prefix for their room names. The `Conversation` table uses a single `id` namespace, so collision between a DM id and a channel id is impossible (UUIDs). However, for a user who belongs to a workspace with a "general" channel, the user joins `conversation:{generalChannelId}`. If that user also has a DM with the same UUID (impossible), they'd join it twice — but `socket.join` is idempotent. Not a correctness bug, but the code treats DMs and channels identically despite fundamentally different semantics. A DM conversation event is broadcast to a room the workspace member may not expect to be in (e.g., when switching workspaces).

### 8. `workspace:join` Leaves Previous Conversation Rooms Stale on Room-Name Prefix Collision

**File:** `server/src/socket/handlers/workspace.handler.ts:20-24`

```typescript
socket.rooms.forEach((room) => {
  if (room.startsWith("conversation:") && socket.data.activeWorkspaceRooms?.includes(room)) {
    socket.leave(room);
  }
});
```

This iterates ALL rooms the socket is in, including internal socket.io rooms (like the socket's own ID room `socket#<id>`). If a socket ID happens to start with `conversation:` (theoretically possible with certain ID generators), it would attempt to leave its own system room. Socket.io silently ignores leaving non-existent rooms, so this is a theoretical edge case. But the loop over `socket.rooms` modifies the set being iterated (`socket.leave` removes from `socket.rooms`), which is undefined behavior in JavaScript Sets when modified during iteration. The code works in practice because `socket.io` internally manages room membership asynchronously, but it violates the iteration contract.

### 9. `dispatchConversationUpdate` Builds Ad-Hoc Payload Instead of Reusing Dispatchers

**File:** `server/src/modules/invites/invites.controller.ts:41-56`

```typescript
function dispatchConversationUpdate(conversationId: string, userId: string) {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, {
      conversationId,
      type: "MEMBER_JOINED",
      userId,
      conversation: { id: conversationId, updatedAt: new Date().toISOString() }
    });
  } catch (err) { ... }
}
```

This controller-local function emits a `CONVERSATION_UPDATE` event with a different shape than the `dispatchMessageEvent` function in socket.dispatcher.ts. The `dispatchMessageEvent` (socket.dispatcher.ts:53-56) emits `CONVERSATION_UPDATE` with `{ conversation: conversationMetadata }`, while this one emits `{ conversationId, type, userId, conversation }`. The client handler `handleConversationUpdate` (conversation.handlers.ts:77) expects `payload.conversation.id` to exist — both formats provide that, but the extra `type` and `userId` fields from the invite controller are ignored by the client. The inconsistency makes future refactoring fragile.

### 10. `dispatchUserPresence` ONLINE Broadcasts to ALL Clients Without Target Socket

**File:** `server/src/socket/socket.dispatcher.ts:144-145`

```typescript
} else {
  io.emit(SOCKET_EVENTS.USER_ONLINE, { userId: userIdOrIds as string });
}
```

When no `targetSocket` is provided, `io.emit` broadcasts to every connected socket across all rooms — including users who share no workspaces or conversations with the online user. This leaks presence information globally. By contrast, the OFFLINE event (line 148) also uses `io.emit` globally. A user's online/offline status is visible to every other connected user, regardless of relationship.

---

## MINOR BUGS

### 11. Client and Server Maintain Duplicate `SOCKET_EVENTS` Constants

**Files:** `server/src/shared/socket-events.ts` · `client/src/socket/socket-events.ts`

Both files are identical but maintained separately. If a developer adds a new event to one file but forgets the other, the event silently fails (client listens for a different string than server emits). These should be extracted to a shared package or at minimum enforced by a CI diff check.

### 12. `conversation:update` Event Used for Two Different Purposes

The `CONVERSATION_UPDATE` event is emitted with two different payload shapes:
- `dispatchMessageEvent` (socket.dispatcher.ts:54) emits `{ conversation: ConversationMetadata }`
- `dispatchConversationUpdate` in invites.controller.ts:44 emits `{ conversationId, type, userId, conversation }`

Both handlers on the client (`handleConversationUpdate` in conversation.handlers.ts and `useConversationSocket.onMessageRead`) expect different subsets of these fields. There's no type differentiation based on a `type` discriminator field at the socket event level.

### 13. `handleMessageNew` Document Title Accumulates Multiple Prefixes

**File:** `client/src/socket/handlers/message.handlers.ts:58-59`

```typescript
const originalTitle = document.title.replace(/^\(\d+\)\s/, "");
document.title = `(1) New Message! - ${originalTitle}`;
```

If multiple messages arrive before the user focuses the window, each handler instance reads the current `document.title` (which may already have the prefix from a previous handler) and prepends again. The title becomes: `(1) New Message! - (1) New Message! - Original Title`. The regex only strips one occurrence.

### 14. `TypingIndicator` Relies on Render Cycle to Expire Stale Entries

**File:** `client/src/modules/messages/components/TypingIndicator.tsx:23-26`

Stale typing entries (older than 4s) are filtered on every render but **never removed from the zustand store**. If a user types once and never sends a `typing:stop`, the entry persists in the store indefinitely until a new typing event for the same conversation triggers a re-render and filter. The store accumulates stale data. A user who disconnects without sending `typing:stop` leaves a permanent phantom "typing..." indicator (only hidden by the render-time filter — any new render shows it again if within the 4s window).

### 15. `presenceStore.redisAvailable` Can Throw Instead of Returning False

**File:** `server/src/socket/presenceStore.ts:19-25`

```typescript
private get redisAvailable(): boolean {
  try {
    return redis.isReady === true;
  } catch {
    return false;
  }
}
```

If `redis` is `undefined` (import failed, not initialized), accessing `redis.isReady` throws a `TypeError: Cannot read properties of undefined`. The try-catch catches this, but only if the error is thrown within the try block. If `redis` is a Proxy or getter that throws outside the property access, or if the module import itself fails silently leaving `redis` as `undefined`, this crashes. A nullish check (`if (!redis) return false`) would be safer.

### 16. `workspace:join` Doesn't Validate Payload Shape

**File:** `server/src/socket/handlers/workspace.handler.ts:8-9`

```typescript
socket.on("workspace:join", async (payload: { workspaceId: string }, callback) => {
```

There is no validation that `payload.workspaceId` is a string or exists. If the client sends an empty object (`{}`), `payload.workspaceId` is `undefined`, `isWorkspaceMember(userId, undefined)` is called, which would fail or return false depending on the DB query behavior. The error is caught by the generic catch block and returns `{ success: false }` with no error detail. Compare with `MESSAGE_SEND` which validates payload shape explicitly (message.handler.ts:56).

### 17. Socket Auth Middleware Path Resolution May Fail

**File:** `server/src/socket/middlewares/auth.ts:3`

```typescript
import { SOCKET_AUTH_ERRORS } from "../socketErrors"; // adjust path as needed
```

The comment `// adjust path as needed` suggests uncertainty about the import path. If run from a different working directory or build output structure, this import may fail silently (depending on TypeScript resolution). The other socket files use `.js` extensions in their imports (e.g., `../socket.dispatcher.js`), while this one does not.

### 18. `useSocketEvents` Depends on Object Reference — Inefficient Re-Registration

**Files:** `client/src/socket/useSocketEvent.ts:31` · `client/src/modules/chat/hooks/useConversationSocket.ts:168`

The `useSocketEvents(events)` hook depends on the entire `events` object reference. `useConversationSocket` wraps its handlers in `useMemo` with `[conversationId, queryClient]` dependency. If `queryClient` reference changes (possible in development with HMR), **all** handlers — including typing indicators, message events, read receipts — are unregistered and re-registered. During the gap, the user misses real-time events.

### 19. `handleConversationNew` Overwrites `updatedAt` Without Latest Message

**File:** `client/src/socket/handlers/conversation.handlers.ts:88-90`

```typescript
return {
  ...conv,
  updatedAt: payload.conversation.updatedAt,
  latestMessageId: payload.conversation.latestMessageId,
  latestMessage: payload.conversation.latestMessage,
  ...
};
```

The `handleConversationUpdate` handler (fired from invite resolution and message events) copies `updatedAt`, `latestMessageId`, and `latestMessage` from the payload. But the `sorted` conversations are re-sorted by `updatedAt` only if `shouldSort === true` (line 99). For workspace channels, sorting is skipped (line 114), so a channel's position in the sidebar stays fixed. For DMs, sorting happens, but `payload.conversation` only includes the fields in `ConversationUpdatePayload` which doesn't include `members` — so the DM's member list in the sidebar cache gets truncated or left stale.

### 20. `socket.auth` Callback May Reconnect with Stale Token After Session Refresh

**File:** `client/src/socket/socketClient.ts:9-16`

```typescript
auth: async (cb) => {
  const { data: { session } } = await supabase.auth.getSession();
  cb({ token: session?.access_token });
}
```

The auth callback runs when the socket connects or reconnects. If the Supabase session was refreshed via HTTP (cookie-based refresh) while the socket was already connected, the client doesn't know about the new token. On socket disconnect/reconnect, the callback fetches `getSession()` which should return the refreshed session — correct. But if `getSession()` returns null (session expired and refresh failed), the socket connects with `{ token: null }`, the server rejects it with `TOKEN_MISSING`, and the client stays disconnected. There's no retry logic in the client socket initialization.

### 21. `SocketProvider` Assumes Socket Connects Immediately

**File:** `client/src/socket/socketProvider.tsx:76-82`

```typescript
useEffect(() => {
  if (socket.connected) {
    setSocketStatus("connected");
  } else {
    socket.connect();
  }
}, [setSocketStatus]);
```

The effect runs once on mount (the `socketStatus` setter is stable). If `socket.connected` is false (initial state), it calls `socket.connect()`. But `socket.connect()` is asynchronous — the connection attempt starts but may fail or take time. The `setSocketStatus("connected")` only runs when `socket.connected` was true at mount. After `connect()` is called, the transition is handled by the `connect` event handler at line 21 (`onConnect`), which is registered via `useSocketEvents`. If `useSocketEvents` hasn't mounted its effect yet (render ordering), the `connect` event fires before the handler is registered, and the socket status stays in the initial `"disconnected"` state until the next `connect` event (which won't happen unless the socket reconnects).

---

## DESIGN ISSUES (not bugs, but notable)

- **No shared types package**: Server and client have independent copies of `SOCKET_EVENTS`, `MessageReadPayload`, `ConversationUpdatePayload`. Any schema change requires updating both.
- **`dispatchUserStatusUpdate` doesn't emit to conversation rooms**: Status changes are broadcast to workspace rooms and the user's own room, but not to DM conversation rooms. Two users DMing each other outside a workspace won't see status changes.
- **`WORKSPACE_UPDATE` event is never emitted by the server**: The client handles it (cache invalidation), but no server code ever emits it.
- **No socket event for user typing expiration**: The `TypingIndicator` uses a client-side 4s expiry. If the user's socket disconnects without sending `typing:stop`, other users see phantom "typing..." until another event causes a re-render with the 4s filter.
