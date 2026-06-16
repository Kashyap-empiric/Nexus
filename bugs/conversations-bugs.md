# Conversations Module Bug Analysis

Covers server (`server/src/modules/conversations/`) and client (`client/src/modules/conversations/`).

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
