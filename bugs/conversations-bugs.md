# Conversations Module Bug Analysis

Covers server (`server/src/modules/conversations/`) and client (`client/src/modules/conversations/`).

---

## CRITICAL BUGS

### 1. Socket Rooms Never Cleaned Up When User Is Removed From Workspace

**Files:**
- `server/src/socket/socket.ts:48-67` — joins `conversation:*` rooms on connect
- `server/src/modules/workspaces/workspaces.controller.ts:377-418` — `removeWorkspaceMember` does NOT leave rooms

When a socket connects, it joins `conversation:${id}` rooms for every conversation it has access to (DMs + workspace channels). If the user is later **removed** from a workspace, these rooms are **never left**:
- `removeWorkspaceMember` in `workspaces.controller.ts` dispatches `dispatchMemberUpdate` to the workspace room
- But it does NOT call `socket.leave(roomName)` for any channel rooms the removed user had joined
- The removed user's socket continues to receive `message:new`, `message:update`, `message:delete`, typing indicators, and read receipts from those channels
- The privilege escalation only ends when the user disconnects or refreshes

**Fix:** After removing a member, iterate the removed user's sockets and leave all `conversation:*` rooms associated with that workspace.

### 2. `createConversation` Doesn't Validate `targetUserId` Exists — Foreign Key Crash

**File:** `server/src/modules/conversations/conversations.controller.ts:39`

(Also documented as existing Bug 1 in the Medium section — promoted to Critical.)

If a non-existent UUID is passed as `targetUserId`, Prisma throws a `P2003` foreign key constraint violation when trying to create `ConversationMember`. The generic catch block returns `"Internal server error"` instead of `"User not found"`. This is a 500 that should be a 404.

---

## HIGH BUGS

### 3. `req.user!.id` Used Without Verifying `req.user` Exists

**Files (multiple controllers):**
- `server/src/modules/conversations/conversations.controller.ts:9` — `const userId = req.user!.id;`
- `server/src/modules/messages/messages.controller.ts:26` — same pattern
- `server/src/modules/workspaces/workspaces.controller.ts:11` — same pattern
- `server/src/modules/notifications/notifications.controller.ts:10` — same pattern
- `server/src/modules/users/users.controller.ts:9` — same pattern

Every controller uses the non-null assertion `req.user!.id`. If the `authMiddleware` fails to set `req.user` (e.g., middleware order changes, a route accidentally skips auth, or an unauthenticated request reaches the controller), this will crash with `TypeError: Cannot read properties of undefined (reading 'id')`.

**Contrast with invite controller:** `invites.controller.ts:10` correctly uses `req.user?.id` with optional chaining and checks `if (!userId)`.

### 4. `ConversationUpdatePayload` UUID Comparison Is Fragile

**File:** `client/src/socket/handlers/conversation.handlers.ts:24-27`

```typescript
if (data.lastReadMessageId && member.lastReadMessageId) {
  if (data.lastReadMessageId > member.lastReadMessageId) {
    member.lastReadMessageId = data.lastReadMessageId;
  }
}
```

This compares UUID strings lexicographically (`>` operator on strings). UUIDv7 is time-sortable (the timestamp is the first part of the UUID), so this works for now. But:
- If the ID generation strategy changes (e.g., to UUIDv4, or a different prefix), the comparison silently breaks
- Non-time-sortable UUIDs have no meaningful lexicographic ordering
- CUID, NanoID, or any non-UUIDv7 ID would break this comparison

**Fix:** Compare by parsing timestamps or use a dedicated `compareMessageIds` utility.

### 5. `findDMByPair` Exposes Full User Objects Including Sensitive Fields

**File:** `server/src/modules/conversations/conversations.repository.ts:58`

```typescript
include: { user: true },
```

The full `User` model is included. If the schema includes fields like `email`, `supabaseUserId`, or any future sensitive fields, these are exposed in every conversation response. Other repository methods use `select` to limit fields — this one is inconsistent.

---

## MEDIUM BUGS

### 1. `createConversation` Doesn't Validate `targetUserId` Exists

**File:** `server/src/modules/conversations/conversations.controller.ts:39`

The `createConversationSchema` validates `targetUserId` is a UUID, but the controller never checks if a user with that ID actually exists. If a non-existent UUID is passed:
- `createOrGetDM` calls `getDMByUsers` (returns null — fine)
- Then calls `createDM` which creates the DM
- The `conversationMember.create` references `targetUserId` as a foreign key → Prisma throws `P2003` (foreign key violation)
- The generic catch block returns a 500 error

The user gets `"Internal server error"` instead of `"User not found"`.

### 2. `markConversationAsRead` Uses Dynamic Import on Every Request

**File:** `server/src/modules/conversations/conversations.controller.ts:65`

```typescript
const { getMessageById } = await import("../messages/messages.service.js");
```

This dynamic `import()` is executed on **every** `PATCH /conversations/:id/read` request. While ES module dynamic imports can be cached by the runtime, this is non-idiomatic and adds unnecessary async overhead. The import should be a static `import` at the top of the file.

### 3. `findDMByPair` Exposes Sensitive User Fields

**File:** `server/src/modules/conversations/conversations.repository.ts:58`

```typescript
include: { user: true },
```

The full user object is included. If the `User` model includes fields like `email`, `hashedPassword`, `supabaseUserId`, etc., these are exposed in the response. The other repository methods properly use `select` to limit fields. This is inconsistent and a potential data leak.

### 4. `getConversations` Has No Cache Invalidation Strategy

**File:** `server/src/modules/conversations/conversations.controller.ts:7-16`

`getConversations` always performs a fresh DB query. Combined with `findDMsByUserId` which also fetches `latestMessage` with user data, this is a relatively expensive query. There's no ETag, Last-Modified, or any caching header. The client may re-fetch aggressively.

### 5. `countUnreadMessages` Double-Filters on Author

**File:** `server/src/modules/conversations/conversations.repository.ts:163-180`

```typescript
const whereClause = {
  conversationId,
  userId: { not: userId },  // ← excludes messages by the current user
};

if (lastReadMessageId) {
  whereClause.id = { gt: lastReadMessageId };
}
```

The `userId: { not: userId }` filter excludes messages authored by the current user. But the caller already handles this:
```typescript
conv.latestMessage?.userId !== userId  // in conversations.service.ts:22
```

This means:
- Unread counts for conversations where the user sent the latest message are always 0 (correctly)
- But if the user sent message #5 and another user sent messages #6 and #7, the unread count should be 2 (from lastReadMessageId offset). The `userId: { not: userId }` filter correctly excludes the user's own messages from this count.
- **However**, if `lastReadMessageId` is null (user has never read the conversation), ALL messages from other users are counted, which is correct.

The logic is actually correct, but the double-condition (`userId !== lastMessage.userId` in the service + `userId: { not: userId }` in the repo) is confusing and could mask bugs. If the service check is removed in the future, the unread count would still be off by 1 (the user's own latest message).

### 6. No Rate Limiting on Conversation Creation

**File:** `server/src/modules/conversations/conversations.routes.ts:25-30`

`POST /conversations/` has no rate limiter. A user could spam-create conversations, generating unnecessary DB writes and socket dispatches. The messages endpoint has `messageLimiter` — conversations should have a similar protection.

### 7. `getConversationDetails` Has No Access Check Without Middleware

**File:** `server/src/modules/conversations/conversations.routes.ts:32-37`

The route relies entirely on the `requireConversationMember` middleware for access control. If this middleware is ever removed, the controller itself has no access check. The `getConversationById` service returns the full conversation regardless of membership. This is defense-in-depth: the controller should verify access even if the middleware is bypassed.

---

## MINOR BUGS

### 8. `conversations.schema.ts` Defines Schemas But `getConversations` Doesn't Use Validation

**File:** `server/src/modules/conversations/conversations.controller.ts:7-16` · `server/src/modules/conversations/conversations.schema.ts`

`getConversations` takes no query/param input, so validation isn't strictly needed. But the `conversationParamsSchema` for `:id` exists and is used nowhere — the routes parse `req.params` manually.

### 9. Conversation Routes Mount Messages Sub-Routes at a Confusing Path

**File:** `server/src/modules/conversations/conversations.routes.ts:17`

```typescript
router.use("/:conversationId/messages", messagesRoutes);
```

Messages routes are mounted as sub-routes of the conversations module. This works but means messages route definitions are relative. If someone reads `messages.routes.ts` in isolation, the path structure is unclear.

### 10. `createOrGetDM` Has TOCTOU Race Condition

**File:** `server/src/modules/conversations/conversations.service.ts:75-95`

The function checks for an existing DM, then creates one if not found. Between the check and create, another request could create the same DM. The P2002 catch handles this gracefully, but:
- The catch queries the DB again (wasteful on contention)
- The function returns `{ created: true }` for the second caller even though the DM already existed (from the first caller). Both callers get `created: true` but only one actually created it.

This is a minor semantic issue — the DM is correctly returned, but the `created` flag is misleading under concurrent access.

### 11. No `console.log` Cleanup in Controller

**File:** `server/src/modules/conversations/conversations.controller.ts:37`

```typescript
console.log("createConversation called with body:", req.body);
```

Production code includes a debug log that leaks request bodies.

### 12. `createOrGetDM` Doesn't Trim Whitespace in `dmPair`

**File:** `server/src/modules/conversations/conversations.service.ts:4-6`

```typescript
const buildDmPair = (userIdA: string, userIdB: string) => {
    return [userIdA, userIdB].sort().join(":");
};
```

The `dmPair` is constructed from raw UUID strings. This is correct for UUIDs. But if `userIdA` or `userIdB` has leading/trailing whitespace (possible from client-side input), the pair becomes `" uuid-1:uuid-2 "` instead of `"uuid-1:uuid-2"`. The same two users could create multiple DM conversations by passing whitespace-padded IDs, bypassing the deduplication check.

### 13. Conversation Routes `GET` Endpoints Skip Validation

**File:** `server/src/modules/conversations/conversations.routes.ts`

`GET /conversations` and `GET /conversations/:id` have no `validate()` middleware. While GET routes typically have less validation, the `:id` param is not checked for valid UUID format. Invalid UUIDs pass through to the database query, which returns 404. This works but the error response is inconsistent with validated endpoints that return structured validation errors.
