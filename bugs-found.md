# Socket Event Bug Analysis — Message Edit/Delete Events

## Fix Status

| # | Bug | Status | Fixed In |
|---|-----|--------|----------|
| 1 | Edit/Delete socket handlers only `invalidateQueries` instead of updating cache in-place | ✅ **FIXED** | `useConversationSocket.ts` — switched to `setQueryData` in-place updates |
| 3 | No optimistic updates for Edit/Delete mutations | ✅ **FIXED** | `useMessages.ts` — added `onMutate` + `onError` rollback to both mutations |
| 5 | Missing `messageLimiter` on DELETE route | ✅ **FIXED** | `messages.routes.ts` — added `messageLimiter` middleware |
| 6 | CONVERSATION_UPDATE emitted with wrong event name string | ✅ **FIXED** | `invites.controller.ts` — replaced raw string with `SOCKET_EVENTS.CONVERSATION_UPDATE` |
| 10 | `socketClient.ts` auth callback doesn't handle errors | ✅ **FIXED** | `socketClient.ts` — wrapped in try/catch, always calls `cb()` |
| 11 | `handleConversationUpdate` doesn't preserve `unreadCount` | ✅ **FIXED** | `conversation.handlers.ts` — added explicit `unreadCount: conv.unreadCount` |
| 2 | MESSAGE_UPDATE/MESSAGE_DELETE not handled at global (sidebar) level | ❌ **Open** | — |
| 4 | Double cache invalidation on Edit/Delete | ❌ **Open** | — |
| 7 | TYPING_START/TYPING_STOP defined but never used | ❌ **Open** | — |
| 8 | `workspace:join` raw string — no constant, no client emitter | ❌ **Open** | — |
| 9 | Inefficient room-join loop in `dispatchConversationNew` | ❌ **Open** | — |
| 12 | `editMessage` uses stale `updatedAt` in conversation metadata | ❌ **Open** | — |

---

## Bug 1: Edit/Delete socket handlers only `invalidateQueries` instead of updating cache in-place

### Status: ✅ **FIXED**

**Fix applied**: Replaced `queryClient.invalidateQueries()` with `queryClient.setQueryData()` in both `onMessageUpdate` and `onMessageDelete` handlers in `useConversationSocket.ts`. The handlers now update the cache in-place (same pattern as `onMessageNew`), so edits/deletes appear instantly without a network round-trip.

### Files
- `client/src/modules/chat/hooks/useConversationSocket.ts`

### Original Root Cause
The `onMessageUpdate` and `onMessageDelete` handlers in `useConversationSocket.ts` only called `queryClient.invalidateQueries()`, triggering a **full network refetch** from the server instead of updating the cache in-place:

```ts
const onMessageUpdate = (message: Message) => {
    if (!message || message.conversationId !== conversationId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
};

const onMessageDelete = (message: Message) => {
    if (!message || message.conversationId !== conversationId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
};
```

Compare to `onMessageNew`, which updates the cache **in-place** using `setQueryData`:

```ts
const onMessageNew = (message: Message) => {
    queryClient.setQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId),
        (oldData) => { /* smart merge — no network request */ }
    );
};
```

### Why this caused the perceived "not firing"

When a message was edited or deleted:
1. The server **did** emit the `message:update` / `message:delete` event ✅
2. The client **did** receive it ✅
3. `onMessageUpdate` / `onMessageDelete` **did** run and call `invalidateQueries` ✅
4. BUT: the user saw no visual change until the **network refetch completed** ⏳

On a fast connection this was ~100-300ms delay. On a slow connection it could be multiple seconds. During this time the user saw no change in the UI — and perceived it as "the event didn't fire."

---

## Bug 2: MESSAGE_UPDATE and MESSAGE_DELETE not handled at the global (sidebar) level

### Status: ❌ **Open — not yet fixed**

### Files
- `client/src/socket/eventRouter.ts`
- `client/src/modules/chat/hooks/useGlobalSocket.ts`

### Root Cause
`eventRouter.ts` only exports handlers for `messageNew`, `messageRead`, `conversationNew`, and `conversationUpdate`. There are **no handlers exported** for `MESSAGE_UPDATE` or `MESSAGE_DELETE`:

```ts
return {
    messageNew: handleMessageNew(queryClient),
    messageRead: handleMessageRead(queryClient),
    conversationNew: handleConversationNew(queryClient),
    conversationUpdate: handleConversationUpdate(queryClient),
    // No messageUpdate / messageDelete handlers
};
```

Consequently, `useGlobalSocket.ts` (used only by the `Sidebar`) does **not register** `MESSAGE_UPDATE` or `MESSAGE_DELETE`:

```ts
[SOCKET_EVENTS.MESSAGE_NEW]: router.messageNew,
[SOCKET_EVENTS.MESSAGE_READ]: router.messageRead,
// MESSAGE_UPDATE and MESSAGE_DELETE are missing
[SOCKET_EVENTS.CONVERSATION_NEW]: router.conversationNew,
[SOCKET_EVENTS.CONVERSATION_UPDATE]: router.conversationUpdate,
```

### Impact
- The **sidebar** does not react to `message:update` / `message:delete` events directly.
- **Mitigated by** `CONVERSATION_UPDATE`: The server emits `CONVERSATION_UPDATE` alongside `MESSAGE_UPDATE`/`MESSAGE_DELETE` when the edited/deleted message is the **latest message** in the conversation. Since the sidebar **does** handle `CONVERSATION_UPDATE`, it still updates in this case.
- Not mitigated: edits/deletes of **non-latest messages** — these don't emit `CONVERSATION_UPDATE`, so the sidebar remains stale. (Though this is arguably correct behavior — editing an old message shouldn't change the sidebar.)

---

## Bug 3: No optimistic updates for Edit/Delete mutations (UX issue)

### Status: ✅ **FIXED**

**Fix applied**: Added `onMutate` handlers to both `useEditMessageMutation` and `useDeleteMessageMutation` that:
- Cancel in-flight queries
- Save previous cache state
- Optimistically update the cache (edit: sets `content` + `isEdited: true`; delete: sets `deletedAt`)
- Roll back to saved state in `onError`
- Replace with server response in `onSuccess` (in-place `setQueryData`)

### Files
- `client/src/modules/messages/hooks/useMessages.ts`

### Original Root Cause
The `useEditMessageMutation` and `useDeleteMessageMutation` had **no `onMutate` handler** for optimistic updates:

```ts
export const useEditMessageMutation = (conversationId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ messageId, content }) => {
            return messagesApi.editMessage(conversationId, messageId, content);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to edit message");
        },
    });
};
```

---

## Bug 4: Double cache invalidation on Edit/Delete (Minor)

### Status: ❌ **Open — partially mitigated**

### Files
- `client/src/modules/messages/hooks/useMessages.ts`
- `client/src/modules/chat/hooks/useConversationSocket.ts`

### Root Cause
When a message is edited or deleted, the query cache was invalidated **twice**:

1. **Mutation `onSuccess`** fires after the HTTP request succeeds
2. **Socket event handler** fires when the `message:update`/`message:delete` event arrives

Now that both code paths use `setQueryData` (in-place update) instead of `invalidateQueries`, the double invalidation is no longer an issue. However, both code paths still update the cache redundantly.

### Impact
- **Now minimal**: Both the mutation's `onSuccess` and the socket handler update the cache in-place. The second update is a no-op since the data is already correct. No server requests are triggered.

---

## Bug 5: Missing `messageLimiter` on DELETE message route

### Status: ✅ **FIXED**

**Fix applied**: Added `messageLimiter` middleware to the DELETE route in `messages.routes.ts`, matching the order used in PATCH and POST (`messageLimiter, authMiddleware, validate, ...`).

### Files
- `server/src/modules/messages/messages.routes.ts`

### Original Root Cause
The `PATCH` route had `messageLimiter` middleware, but the `DELETE` route did not:

```ts
// PATCH — has rate limiter ✓
router.patch(
    "/:messageId",
    messageLimiter,          // ✓ present
    authMiddleware,
    validate({ params: messageIdParamsSchema, body: updateMessageBodySchema }),
    requireConversationMember({ paramName: "conversationId" }),
    updateMessage
);

// DELETE — NO rate limiter ✗
router.delete(
    "/:messageId",
    authMiddleware,          // messageLimiter MISSING
    validate({ params: messageIdParamsSchema }),
    requireConversationMember({ paramName: "conversationId" }),
    deleteMessage
);
```

---

---

## Bug 6: CONVERSATION_UPDATE emitted with wrong event name string in invites controller

### Status: ✅ **FIXED**

**Fix applied**: Replaced raw string `"CONVERSATION_UPDATE"` with `SOCKET_EVENTS.CONVERSATION_UPDATE` (value: `"conversation:update"`) in the `dispatchConversationUpdate` function. Added the import for `SOCKET_EVENTS`.

### Files
- `server/src/modules/invites/invites.controller.ts`

---

## Bug 7: TYPING_START and TYPING_STOP events defined but never used

### Status: ❌ **Open**

### Files
- `client/src/socket/socket-events.ts`
- `server/src/shared/socket-events.ts`

### Root Cause
Both client and server define `TYPING_START` and `TYPING_STOP` in their socket event constants, but no code anywhere in the codebase emits or handles these events. The typing indicator feature was planned but never implemented.

### Impact
- Dead constants in the codebase that could confuse new developers.
- No typing indicators shown to users.

---

## Bug 8: `workspace:join` event is a raw string — no constant, no client emitters

### Status: ❌ **Open**

### Files
- `server/src/socket/handlers/workspace.handler.ts`

### Root Cause
The server registers a handler for the raw string `"workspace:join"` but:
1. The event name is not defined in `SOCKET_EVENTS` constants
2. No client code anywhere emits `"workspace:join"`
3. No client code would know the correct event name to emit

```ts
socket.on("workspace:join", async (payload, callback) => { ... });
```

### Impact
- The `workspace:join` handler exists on the server but is **never triggered** because no client emits the event.
- Channel rooms are only joined at connection time — if channels are created after the user connects, the user won't receive events for those channels unless they reconnect.
- The handler was clearly written to dynamically join workspace channel rooms, but the client-side integration was never built.

---

## Bug 9: Inefficient room-join loop in `dispatchConversationNew`

### Status: ❌ **Open — Performance**

### Files
- `server/src/socket/socket.dispatcher.ts`

### Root Cause
`dispatchConversationNew` iterates over ALL connected sockets for each conversation member to find sockets that belong to that user:

```ts
for (const member of conversation.members) {
    for (const socket of io.sockets.sockets.values()) {
        if (socket.rooms.has(`user:${member.userId}`)) {
            await socket.join(`conversation:${conversation.id}`);
        }
    }
}
```

This is **O(members × totalConnectedSockets)**. For a large deployment with thousands of sockets, this is extremely inefficient. Socket.IO provides `io.in()` or room-based lookups for this purpose.

### Impact
- Performance bottleneck when creating conversations in a deployment with many connected users.
- Can be replaced with `io.to(`user:${userId}`).sockets.forEach(...)` or tracked room membership sets.

---

## Bug 10: `socketClient.ts` auth callback doesn't handle errors

### Status: ✅ **FIXED**

**Fix applied**: Wrapped `supabase.auth.getSession()` in a `try/catch` that logs the error and calls `cb({ token: null })` on failure, so the socket connection never hangs from an unhandled auth error.

### Files
- `client/src/socket/socketClient.ts`

---

## Bug 11: `handleConversationUpdate` doesn't preserve `unreadCount`

### Status: ✅ **FIXED**

**Fix applied**: Added explicit `unreadCount: conv.unreadCount` to the return object in `handleConversationUpdate` to preserve the unread count regardless of cache structure.

### Files
- `client/src/socket/handlers/conversation.handlers.ts`

---

## Bug 12: `editMessage` service uses stale `updatedAt` timestamp

### Status: ❌ **Open**

### Files
- `server/src/modules/messages/messages.service.ts`

### Root Cause
When `editMessage` builds the `conversationMetadata` for the CONVERSATION_UPDATE event, it uses the conversation's existing `updatedAt` instead of the current time:

```ts
let conversationMetadata = null;
if (message.conversation?.latestMessageId === messageId) {
    conversationMetadata = {
        id: message.conversation.id,
        name: message.conversation.name,
        updatedAt: message.conversation.updatedAt,  // ← old timestamp!
        latestMessageId: message.conversation.latestMessageId,
        latestMessage: { ... },
    };
}
```

When a message is edited, the conversation's `updatedAt` in the database is NOT bumped. The `CONVERSATION_UPDATE` event carries the old `updatedAt`, so the sidebar doesn't re-sort conversations based on the edit time.

Compare to `createMessage`, which passes the fresh `conversation.updatedAt` from the Prisma transaction (which sets `updatedAt: new Date()`).

### Impact
- Editing a message doesn't bump the conversation's position in the sidebar.
- The sidebar sort order doesn't reflect message edits.

---

## Summary Table

| # | Bug | Severity | Area | Status |
|---|-----|----------|------|--------|
| 1 | Edit/Delete socket handlers only `invalidateQueries` instead of updating cache in-place | **High** | Client (`useConversationSocket.ts`) | ✅ Fixed |
| 2 | MESSAGE_UPDATE/MESSAGE_DELETE not handled at global (sidebar) level | Medium | Client (`eventRouter.ts`, `useGlobalSocket.ts`) | ❌ Open |
| 3 | No optimistic updates for Edit/Delete mutations | Medium | Client (`useMessages.ts`) | ✅ Fixed |
| 4 | Double cache invalidation on Edit/Delete | Low | Client (`useMessages.ts`, `useConversationSocket.ts`) | ❌ Open (partially mitigated) |
| 5 | Missing `messageLimiter` on DELETE route | Low | Server (`messages.routes.ts`) | ✅ Fixed |
| 6 | CONVERSATION_UPDATE emitted with wrong event name string in invites controller | **High** | Server (`invites.controller.ts`) | ✅ Fixed |
| 7 | TYPING_START/TYPING_STOP defined but never used | Low | Both (`socket-events.ts`) | ❌ Open |
| 8 | `workspace:join` raw string — no constant, no client emitter | Low | Server (`workspace.handler.ts`) | ❌ Open |
| 9 | Inefficient room-join loop in `dispatchConversationNew` | Low | Server (`socket.dispatcher.ts`) | ❌ Open |
| 10 | `socketClient.ts` auth callback doesn't handle errors | Medium | Client (`socketClient.ts`) | ✅ Fixed |
| 11 | `handleConversationUpdate` doesn't preserve `unreadCount` | **High** | Client (`conversation.handlers.ts`) | ✅ Fixed |
| 12 | `editMessage` uses stale `updatedAt` in conversation metadata | Medium | Server (`messages.service.ts`) | ❌ Open |

## Recommended Fixes (Remaining)

### Fix for Bug 2
Create `handleMessageUpdate` and `handleMessageDelete` handlers in the event router that update the sidebar cache when a message is edited or deleted. Register these events in `useGlobalSocket.ts` for symmetry.

### Fix for Bug 7
Either implement the typing indicator feature or remove the unused `TYPING_START`/`TYPING_STOP` constants.

### Fix for Bug 8
Either:
- Add `workspace:join` to the socket event constants and implement the client-side emitter when navigating to a workspace
- Or remove the handler if dynamic room joining is handled elsewhere

### Fix for Bug 9
Replace the nested loop with `io.in()` or tracked room membership: `io.sockets.adapter.rooms.get(`user:${userId}`)?.forEach(sid => ...)`.

### Fix for Bug 12
Update the conversation's `updatedAt` to the current time when editing a message:
```ts
conversationMetadata = {
    ...
    updatedAt: new Date(),  // use current time, not stale timestamp
    ...
};
```

Additionally, consider adding a database-level `updatedAt` bump in the repository's `updateMessage` function.
