# Messages Module Bug Analysis

Covers server (`server/src/modules/messages/`) and client (`client/src/modules/messages/`).

---

## MEDIUM BUGS

### 1. Cursor Pagination Fails Silently on Invalid Cursor

**File:** `server/src/modules/messages/messages.repository.ts:6-29`

```typescript
cursor: cursor ? { id: cursor } : undefined,
```

If an invalid/ non-existent cursor UUID is provided, Prisma throws `NotFoundError` which propagates up as a 500. The `getMessages` controller catches this as a generic error:
```typescript
console.error("Error fetching messages:", error);
res.status(500).json({ error: "Internal server error" });
```

The user gets a generic 500 when they provide a bad cursor. The `notifications.repository.ts` has the same issue — no cursor existence check.

### 2. Message Socket Emissions Are Fire-and-Forget After Response

**File:** `server/src/modules/messages/messages.controller.ts:32-36`

```typescript
try {
  dispatchMessageEvent("NEW", conversationId, message, conversationMetadata);
} catch (err) {
  console.error("[Socket.io] Failed to emit message:new from HTTP endpoint", err);
}
```

The socket event is dispatched after the DB write but before the HTTP response is sent. If socket emission fails:
- The message is saved to DB (correct)
- The HTTP response is still sent with 201 (correct)
- But real-time clients don't receive the update (silent failure)

This is consistent across all message operations (create, update, delete). The error is logged but there's no retry mechanism, no fallback to polling, and no monitoring alert.

### 3. `deleteMessage` Doesn't Verify Message Belongs to Conversation

**File:** `server/src/modules/messages/messages.service.ts:102-144`

The `deleteMessage` function only checks `message.userId !== userId` for authorization but never verifies the message belongs to the conversation in the URL params (`conversationId`). The route params include both `conversationId` and `messageId` but the service only uses `messageId`.

If someone calls `DELETE /conversations/{convA}/messages/{msgInConvB}` with a valid messageId from a different conversation, the deletion succeeds (assuming they own the message). The `requireConversationMember` middleware checks access to `convA`, not the message's actual conversation. This is a **cross-conversation deletion vulnerability**.

Same issue exists in `editMessage` — it doesn't validate `message.conversationId` matches the route `conversationId`.

### 4. `editMessage` Updates `updatedAt` on Conversation Even When Not Latest Message

**File:** `server/src/modules/messages/messages.repository.ts:91-110`

The `updateMessage` function only updates the message content — it does NOT update the conversation's `updatedAt`. This is correct behavior (editing an old message shouldn't bump the conversation).

However, `createMessageTransaction` in the same file (line 68-73) DOES update `updatedAt` on the conversation via `conversation.update`. The `dispatchMessageEvent` in the controller always emits `conversationMetadata` for NEW messages but conditionally emits it for UPDATE/DELETE (based on whether the message was the latest). This inconsistency means:
- Editing the latest message → `conversationMetadata` is emitted with `updatedAt: new Date()` (a new Date, not the actual DB value)
- Editing an old message → no `conversationMetadata` emitted at all

The client-side conversation sorting does get an `updatedAt` bump when the latest message is edited, but it's generated on the server via `new Date()` rather than from the actual DB commit time. Under high load, this clock value may differ from the DB value.

---

## MINOR BUGS

### 5. No Message Content Sanitization

**File:** `server/src/modules/messages/messages.service.ts:22-59`

Message `content` is stored as-is with no sanitization. While React handles XSS in rendering, the raw content is served in API responses. If the API is consumed by a non-React client (mobile app, API integration), the unsanitized content could contain malicious HTML/JS.

The `content.trim()` in `updateMessage` (repository line 98) is minimal sanitization.

### 6. `deleteMessage` Returns Updated Conversation Metadata Even on Non-Latest Deletion

**File:** `server/src/modules/messages/messages.service.ts:116-143`

The function creates `conversationMetadata` only when `conversation?.latestMessageId === messageId` (line 132). But the `conversationMetadata` variable is initialized as `null` and only set inside the if-block. The return value (line 143) correctly returns null metadata for non-latest deletions. However, the `dispatchMessageEvent` in the controller passes this to socket, which does nothing with `null` metadata. This is correct but confusing — a cleaner pattern would be to return `null` explicitly.

### 7. Rate Limiter Applied to Edit/Delete But Not Create

**File:** `server/src/modules/messages/messages.routes.ts:20-27`

The `messageLimiter` is applied to POST (create), PATCH (update), and DELETE routes. But the rate limiter is applied **before** `authMiddleware`. If the rate limiter returns an error before auth runs, the response doesn't include auth context. The ordering should be: `authMiddleware → messageLimiter → validate → requireConversationMember → controller`.

Actually, looking more carefully at the route:
```typescript
router.post("/", messageLimiter, authMiddleware, ...);
```

The `messageLimiter` runs BEFORE `authMiddleware`. This means:
- If the rate limiter blocks the request, unauthenticated users can't distinguish between "rate limited" and "not authenticated"
- The rate limiter works on IP, not userId (since auth hasn't run yet)

This is intentional but worth noting — the rate limiter key is IP-based for unauthenticated requests and userId-based only if the middleware order is swapped.

### 8. `getMessages` Returns `nextCursor` Even When Page Is Empty

**File:** `server/src/modules/messages/messages.service.ts:5-20`

If the conversation has no messages, `messages` is an empty array, `hasNextPage` is `false`, and `nextCursor` is `null`. The response is:
```json
{ "data": [], "nextCursor": null }
```

This is correct but the client must handle `null` vs empty array pagination. Some cursor implementations use `undefined` to indicate "no more pages" vs `null` for "initial page not loaded yet."

### 9. `editMessage` Allows Editing Deleted Messages After Check Removed

**File:** `server/src/modules/messages/messages.service.ts:65-99`

The function explicitly checks `if (message.deletedAt)` and throws `"Cannot edit a deleted message."` — but only on line 70. If this check is ever removed, users could edit deleted messages and "un-delete" them by providing new content (since the soft-delete only sets `deletedAt`, not the content).

### 10. Import at Bottom of File

**File:** `server/src/modules/messages/messages.service.ts:146`

```typescript
import { runTransaction as prismaTransaction } from "@/lib/transaction.js";
```

This import is at the **bottom** of the file. ES module imports are hoisted so it works, but this violates the convention of imports at the top. Code reviewers may miss this import, and tooling may not auto-organize it correctly.
