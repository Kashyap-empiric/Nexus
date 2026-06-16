# Critical Bugs — Consolidated Across All Modules

> This file aggregates all **critical-severity** bugs identified across the codebase.
> These bugs represent data integrity issues, security vulnerabilities, or significant operational risks.

---

## 1. Notifications Written Outside Transaction — Phantom Notifications on Rollback

**Module:** Invites
**Source:** `invites-bugs.md` Bug 1
**Files:**
- `server/src/modules/invites/resolvers/workspaceResolver.ts:46-91`
- `server/src/modules/invites/invites.service.ts:38-44`
- `server/src/modules/notifications/notifications.service.ts:51`

**Root Cause:** `createAndDispatch()` uses the **global Prisma client** (`prisma`), not the transaction client (`tx`). When called inside the workspace resolver's Prisma transaction, the notification is committed immediately. If the transaction later rolls back (e.g., invite consumption fails due to a race condition), the notification persists in the DB even though the workspace join was rolled back.

**Impact:** Users receive "User X joined" or "New member" notifications for actions that never completed. These are phantom notifications — the data they reference may not exist.

**Fix:** Pass `tx` through to `createAndDispatch`, or create notifications after the transaction commits successfully.

---

## 2. DM Created Outside Transaction — Orphan DM on Rollback

**Module:** Invites
**Source:** `invites-bugs.md` Bug 2
**Files:**
- `server/src/modules/invites/resolvers/userResolver.ts:9`
- `server/src/modules/conversations/conversations.service.ts:75-95`
- `server/src/modules/invites/invites.service.ts:33-44`

**Root Cause:** `createOrGetDM()` uses the **global Prisma client** (via `conversations.repository.ts`), NOT the transaction client (`tx`). The DM is committed to the DB immediately. If the invite consumption step then fails, the transaction rolls back but the DM already exists permanently — orphaned from the invite system.

**Impact:** Orphaned DM records in the database with no corresponding consumed invite. The DM exists but the users were never properly onboarded via the invite flow.

**Fix:** Parameterize `createOrGetDM` to accept an optional transaction client, or move DM creation outside the transaction.

---

## 3. No Server-Side Notification DB Entry or Web Push for Messages

**Module:** Notifications
**Source:** `notifications-bugs.md` Bug 1
**Files:**
- `client/src/socket/handlers/message.handlers.ts:9-82`
- `server/src/socket/socket.dispatcher.ts:38-61`
- `server/src/modules/notifications/notifications.service.ts:49-82`

**Root Cause:** Messages (`message:new` socket event) are handled entirely client-side. The server dispatches the socket event but never calls `createAndDispatch` or `sendPushNotification`. No `Notification` row is created in the DB, and no Web Push is triggered.

**Impact:**
- Users who are offline miss message notifications entirely
- The in-app notification list never shows message notifications
- The `showMessageNotification` browser API only works when the tab is open and socket is connected
- Users relying on push for mobile/background never receive message alerts

**Fix:** Call `createAndDispatch` from the message handler on the server side after saving the message, or create a dedicated message notification flow.

---

## 4. Cross-Conversation Message Deletion/Editing

**Module:** Messages
**Source:** `messages-bugs.md` Bug 3
**Files:**
- `server/src/modules/messages/messages.service.ts:65-99` (editMessage)
- `server/src/modules/messages/messages.service.ts:102-144` (deleteMessage)
- `server/src/modules/messages/messages.controller.ts:47-76` (updateMessage)
- `server/src/modules/messages/messages.controller.ts:78-106` (deleteMessage)

**Root Cause:** Both `editMessage` and `deleteMessage` in the service only verify `message.userId !== userId` (message ownership). They **never verify** that `message.conversationId` matches the `conversationId` from the URL route params. The route includes both `conversationId` and `messageId`, but the service only receives `messageId`.

```typescript
// Controller reads both but passes only messageId to service
const { conversationId, messageId } = req.params;
const { message, conversationMetadata } = await messagesService.editMessage(messageId, userId, content);
```

The `requireConversationMember` middleware checks access to the route's `conversationId`, but if the message belongs to a different conversation that the user is also a member of, the operation succeeds on the wrong conversation's message.

**Impact:** A user who is a member of multiple conversations can:
- Delete a message from conversation B by calling `DELETE /conversations/A/messages/{msgFromB}`
- Edit a message from conversation B by calling `PATCH /conversations/A/messages/{msgFromB}`

The socket event is emitted to the route's `conversationId` room (A), not the message's actual conversation (B), so other members of conversation B don't see the delete/edit in real-time — but the DB change is permanent.

**Fix:** Add a check in both `editMessage` and `deleteMessage` to verify `message.conversationId === conversationId` (where `conversationId` is passed from the controller).

---

## 5. Email Address Leaked via User Search API

**Module:** Users
**Source:** `users-bugs.md` Bug 1
**Files:**
- `server/src/modules/users/users.repository.ts:18-24`
- `server/src/modules/users/users.controller.ts:6-18`
- `server/src/modules/users/users.routes.ts:14-19`

**Root Cause:** The `searchUsers` repository method selects `email: true` in the Prisma query:

```typescript
select: {
  id: true,
  username: true,
  fullName: true,
  email: true,     // ← email exposed
  avatarUrl: true,
  avatarPath: true,
},
```

The endpoint `GET /users/search?q=...` is protected by `authMiddleware` (authenticated users only), but any authenticated user can enumerate email addresses by sending partial search queries.

**Impact:** User email addresses are visible to any authenticated user. Combined with the absence of rate limiting (Bug 2 in users-bugs.md), an attacker can:
- Enumerate all registered emails by iterating search queries
- Use leaked emails for phishing or spam
- Map usernames to email addresses

This is a data privacy vulnerability.

**Fix:** Remove `email` from the search select. User email should only be returned for the user's own profile (`GET /users/me`), not in search results.

---

## 6. Socket Rate Limiter Memory Leak

**Module:** Socket
**Source:** `socket-bugs.md` Bug 2
**Files:**
- `server/src/socket/middlewares/rateLimiter.ts:4`

**Root Cause:** The `messageRateLimits` Map adds entries on every `MESSAGE_SEND` event but **never removes them**. Over the lifetime of the server process, every user who has ever sent a message will have a permanent entry.

```typescript
const messageRateLimits = new Map<string, { count: number; resetAt: number }>();
```

There is no TTL sweep, LRU eviction, or cleanup on disconnect.

**Impact:** A slow but unbounded memory leak. For a long-running server with many users, this Map grows linearly with the number of unique users who have sent messages. On a server with 100k daily active users, this could consume tens of megabytes of memory that is never reclaimed.

**Fix:** Add periodic cleanup or use a library with built-in TTL/eviction (e.g., `lru-cache`, `node-cache`). At minimum, attach a cleanup handler that runs every N minutes to purge expired entries.

---

## 7. `dispatchConversationNew` Iterates ALL Connected Sockets — O(n*m) Blowup

**Module:** Socket
**Source:** `socket-bugs.md` Bug 1
**Files:**
- `server/src/socket/socket.dispatcher.ts:18-28`

**Root Cause:** On every new conversation (DM or channel), the dispatcher iterates every connected socket for every conversation member:

```typescript
for (const member of conversation.members) {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.rooms.has(`user:${member.userId}`)) {
      await socket.join(`conversation:${conversation.id}`);
    }
  }
}
```

Socket.io provides `io.in(room)` and adapter-level `socketsJoin` for efficient room joins. Iterating `io.sockets.sockets.values()` manually bypasses these optimizations.

**Impact:** In a deployment with thousands of connected sockets, this is O(members × totalSockets) per new conversation. Creating a channel in a workspace with 500 online members requires iterating 500 × N sockets. For a server with 10k connected sockets, that's 5 million iterations. This blocks the event loop and increases latency for all users.

**Fix:** Use Socket.io's built-in room join:
```typescript
const sockets = await io.in(`user:${member.userId}`).fetchSockets();
for (const socket of sockets) {
  await socket.join(`conversation:${conversation.id}`);
}
```
Or use adapter-level bulk operations if available.

---

## 8. Duplicate Desktop Notification Delivery

**Module:** Notifications
**Source:** `notifications-bugs.md` Bug 2
**Files:**
- `client/src/socket/handlers/notification.handlers.ts:39-53`
- `server/src/services/push.service.ts`
- `client/public/sw.js:44-49`

**Root Cause:** When the user's tab is in the background and a notification arrives, two independent channels deliver it:
1. **Socket path:** `notification.handlers.ts` checks `document.hidden` and calls browser `Notification` API
2. **Web Push path:** `push.service.ts` sends via `webpush.sendNotification()`, caught by the Service Worker's `push` event

These channels are independent. The `tag` field only deduplicates within the Service Worker scope, not between browser `Notification` API and SW `showNotification`.

**Impact:** Users see two desktop notifications for every event when their tab is in the background. This creates a poor UX and may cause notification fatigue.

**Note:** This doesn't apply to message notifications (see Bug 3 — messages don't have server-side push yet), but applies to all workspace/invite notifications.

**Fix:** Either suppress the browser `Notification` API path when the SW is active, or skip the client-side notification when the socket handler is not the primary notification channel.

---

## 9. Push Notification Lifecycle Detached From Request

**Module:** Socket
**Source:** `socket-bugs.md` Bug 3
**Files:**
- `server/src/socket/handlers/message.handler.ts:88-128`

**Root Cause:** The `callback()` (HTTP response) is called **before** the push notification promises resolve:

```typescript
dispatchMessageEvent("NEW", payload.conversationId, message, conversationMetadata);

findById(payload.conversationId).then(async (conv) => {
  // ... push notifications ...
  Promise.all(pushPromises).catch(...)
}).catch(...);

return callback?.({ success: true, data: message });  // ← response sent before push
```

If the socket disconnects before the push notifications settle, the `.catch` handlers silently swallow errors. The entire push chain is detached from the request lifecycle.

**Impact:** Push notifications may or may not complete — there's no guarantee, no visibility, and no monitoring. Users who should receive push notifications for their messages may silently not get them. The sender gets a success response regardless.

**Fix:** Either await the full push chain before responding (trade-off: higher latency) or implement a separate queue/worker for push delivery that provides observability.
