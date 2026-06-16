# Chat Module Bug Analysis (Client)

Covers client (`client/src/modules/chat/`) — the client-side chat UI, socket integration, and state management.

---

## MEDIUM BUGS

### 1. `useConversationSocket` Creates New Handler References on Every `queryClient` Change

**File:** `client/src/modules/chat/hooks/useConversationSocket.ts:17,168`

```typescript
const events = useMemo(() => { ... }, [conversationId, queryClient]);
```

The `queryClient` dependency causes ALL handlers to be recreated and re-registered whenever the queryClient reference changes (HMR, React Query devtools, etc.). During the re-registration gap, no handlers are active — the user misses real-time events. This is a systemic issue with `useSocketEvents` (documented in `socket-bugs.md` Bug 5).

### 2. `onMessageDelete` Merges Instead of Replacing Message

**File:** `client/src/modules/chat/hooks/useConversationSocket.ts:144-146`

```typescript
data: page.data.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
```

When a message is deleted, the handler receives the soft-deleted message (with `deletedAt` set) and merges it via spread. This works correctly for the current payload shape, but if the delete payload only contains `{ id, deletedAt, conversationId }`, the spread `{ ...m, ...message }` preserves stale fields from the old message (like `content`). The UI shows "Message deleted" only if the component specifically checks `deletedAt`. If it falls through to showing `content`, the old text is still displayed.

Compare with the server's `softDeleteMessageInTransaction` which returns the full message object with `deletedAt` set — the client still receives all old fields. A safer approach would be to set the message to a "deleted" sentinel.

### 3. `onMessageUpdate` Spreads Payload Blindly

**File:** `client/src/modules/chat/hooks/useConversationSocket.ts:121`

```typescript
data: page.data.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
```

Same pattern as delete — the incoming payload is spread over the existing message. If the server changes the update payload shape (e.g., removes `content` for deleted messages), the client retains stale data.

### 4. `chatStore.drafts` Uses `Map` — Not Serializable

**File:** `client/src/modules/chat/store/chatStore.ts:40,54-58`

```typescript
drafts: new Map(),
```

Zustand with `Map` is not serializable out of the box. If Redux DevTools or Zustand's persist middleware is enabled, serialization throws. The `Map` methods (`.set()`, `.get()`, `.delete()`) are correct but the store should use a plain object `Record<string, string>` for serialization compatibility.

### 5. `chatStore.lastVisitedChannels` Has No Cleanup on Workspace Leave

**File:** `client/src/modules/chat/store/chatStore.ts:39,46-52`

`lastVisitedChannels` accumulates entries for every workspace the user visits. If the user leaves a workspace, the entry remains. Over time, this grows unboundedly. There's no TTL or cleanup mechanism.

---

## MINOR BUGS

### 6. `useGlobalSocket` and `useConversationSocket` Register Duplicate Event Handlers

**File:** `client/src/modules/chat/hooks/useGlobalSocket.ts:13-24` · `client/src/modules/chat/hooks/useConversationSocket.ts:160-167`

Both hooks register handlers for `MESSAGE_NEW`, `MESSAGE_READ`, `MESSAGE_UPDATE`, `MESSAGE_DELETE` on the same socket instance. For every message event, both handler sets fire:
- `MESSAGE_NEW`: Global handler increments unread counts; Conversation handler adds to message list (correct — intentional)
- `MESSAGE_READ`: Both update the same sidebar cache. The global handler writes `lastReadMessageId`, then the conversation handler overwrites with the same value — redundant but harmless
- `MESSAGE_UPDATE` / `MESSAGE_DELETE`: Same redundant processing

The `MESSAGE_READ` duplication is wasteful but not incorrect. Documented in `socket-bugs.md` Bug 6.

### 7. `chatStore.clearAll` Doesn't Remove Drafts from Memory

**File:** `client/src/modules/chat/store/chatStore.ts:70-78`

`clearAll` creates a `new Map()` for drafts. The old `Map` is garbage collected, but if any React component still holds a reference to the old draft via `useChatStore.getState().drafts`, it retains the stale map.

### 8. `useConversationSocket` Guards Check `conversationId` but Not Payload Validity for Typing Events

**File:** `client/src/modules/chat/hooks/useConversationSocket.ts:23-31`

The typing handlers check `payload.conversationId !== conversationId` but don't validate that `payload.userId` or `payload.username` are strings. If the server sends a malformed typing payload, `addTypingUser` receives undefined values which could corrupt the typing store.
