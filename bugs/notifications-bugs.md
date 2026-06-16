# Notifications System Bug Analysis

## Overview
This document analyzes the Notifications system across server and client. The system handles:
- **In-app notifications** (DB-backed, delivered via Socket.IO)
- **Web Push notifications** (via VAPID/web-push, delivered through Service Worker)
- **Browser Notification API** (shown via `Notification` constructor when tab is in background)
- **Notification preferences** (push on/off, DM/mention/channel toggles)

---

## Critical Issues

### 1. MISSING: No server-side Notification DB entry or Web Push for messages
Messages (`message:new` socket event) are handled entirely client-side in `message.handlers.ts:9-82`. The handler:
- Updates the unread count optimistically in the query cache
- Shows a browser Notification (`showMessageNotification`) when the tab is hidden
- Does NOT call `createAndDispatch`, so no `Notification` row is created in the DB
- Does NOT trigger Web Push, so offline users never receive push for new messages

Meanwhile, workspace events (member joined, invite received, etc.) use `createAndDispatch` which both persists to DB and sends Web Push.

**Impact:** Users who are offline miss message notifications entirely. The in-app notification list will never show message notifications.

### 2. Duplicate notification delivery when tab is in background
When the user's tab is hidden and a notification arrives:

- **Path A (Socket):** `notification.handlers.ts:39-53` checks `document.hidden` and calls `showNotification()` via the browser `Notification` API
- **Path B (Web Push):** `push.service.ts` sends a push via `webpush.sendNotification()`, which the Service Worker (`sw.js:44-49`) catches and calls `self.registration.showNotification()`

These two notification channels are independent. If the socket is still connected AND the push arrives, the user sees two notifications for the same event. The `tag` field only deduplicates within the SW scope, not between browser `Notification` API and SW notifications.

**Impact:** Users get duplicate desktop notifications for every notification event when the tab is in background.

**Note:** This doesn't apply to messages (see issue #1), but applies to workspace/invite notifications.

### 3. `dispatchNotification` is dead code
`socket.dispatcher.ts:75-82` exports `dispatchNotification` but it is never imported or used anywhere in the codebase. All notification dispatch goes through `createAndDispatch` in `notifications.service.ts:49-82`. The function was likely intended as a lightweight dispatch alternative but was never wired up.

### 4. No input validation on `markAsRead` controller
`notifications.schema.ts:8-10` defines `markAsReadParamsSchema` but `notifications.controller.ts:49-60` does not use it. The controller directly reads `req.params.id` without validation:

```typescript
const { id } = req.params as { id: string };
```

Compare with the preferences route which properly uses `validate({ body: updatePreferencesSchema })`.

**Impact:** The route accepts any string as a notification ID, producing opaque Prisma errors for invalid IDs instead of friendly 400 responses.

### 5. DELETE request with body for unsubscribePush
`notifications.api.ts:38-39`:
```typescript
await api.delete(API_ROUTES.NOTIFICATIONS.PUSH_UNSUBSCRIBE, { data: { endpoint } });
```

Many HTTP clients, proxies, and even some browsers strip bodies from DELETE requests. The server expects the endpoint in the request body. If the body is stripped, the `unsubscribePushSchema` parse will fail.

**Alternative:** Use POST for unsubscription, or pass the endpoint as a query parameter.

### 6. Service Worker hardcodes icon paths
`sw.js:35-36`:
```javascript
icon: self.location.origin + '/images/Logo.png',
badge: self.location.origin + '/images/Logo.png',
```

If the icon files are missing or renamed, push notifications will show without an icon. There's no fallback or error handling.

### 7. No Web Push for message notifications (server-side)
Message handling on the server (`socket.dispatcher.ts:38-61`) dispatches `message:new` via Socket.IO but never calls `sendPushNotification` or `createAndDispatch`. Offline users:
- Don't receive push notifications for new messages
- Don't have message notifications in their in-app notification list
- The client-side `showMessageNotification` only works when the tab is open and socket is connected

---

## Medium Issues

### 8. Cursor-based pagination lacks existence validation
`notifications.repository.ts:6-26` passes `cursor` directly to Prisma:
```typescript
...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
```

If `cursor` references a non-existent ID, Prisma throws `NotFoundError`. This should be caught and return empty results instead.

### 9. Client-side `timeAgo` depends on client clock accuracy
`notifications-ui.tsx:3-16` uses `Date.now()` (client time) subtracted from `new Date(dateStr).getTime()` (server time). If the client clock is significantly off (e.g., timezone misconfiguration, clock skew), relative times like "just now" or "5m ago" could be misleading.

### 10. BellPopover shows only 10 items with confusing pagination
`BellPopover.tsx:150` slices `allNotifications.slice(0, 10)` but the infinite query fetches 21 items per page. The "Load more" button at line 157-164 fetches the next page (next 21 items) but the `.slice(0, 10)` still truncates. Users see "Load more" but clicking it may show no visible change if they already had 10+ items.

### 11. No notification permission re-request flow
`NotificationSettings.tsx:27-53`: If a user initially denies notification permission, the `handleToggle("pushEnabled")` sequence calls `subscribeToPush()` which calls `Notification.requestPermission()`. However, browsers don't show the permission prompt again once denied — it immediately returns `"denied"`. The toggle silently fails with no user-facing feedback.

### 12. Duplicate Service Worker registration
`push.ts:25` calls `navigator.serviceWorker.register("/sw.js")` on every subscription attempt. `notifications.ts:16` (`registerServiceWorker`) does the same. While browsers handle duplicate registrations gracefully, this logs redundant "registering" messages and is an architectural smell.

### 13. Optimistic "Mark all read" hides button prematurely
`BellPopover.tsx:171` shows the "Mark all as read" button based on `unreadCount > 0`. The `useMarkAllAsRead` mutation (`useNotifications.ts:59-88`) optimistically sets the unread count to 0 in `onMutate`. If the mutation fails, the button re-appears after `onError` rollback, but there's a visual flash.

On the full Notifications page (`page.tsx:85-93`), the same pattern applies — the button is disabled when `allNotifications.length === 0`, but the list won't visually clear until `onSettled` invalidates the query.

### 14. Notification page has no real-time socket updates
The full notifications page (`page.tsx`) relies on server fetch and infinite query. While `notification.handlers.ts` prepends new notifications to the cache, this only works if the socket handler is mounted. If the user navigates directly to `/notifications`, they see cached or fetched data, but new notifications arriving while on the page are picked up via socket handler — which may or may not be active depending on the layout hierarchy.

### 15. No rate limiting on notification read endpoints
`notifications.routes.ts`: Only `/push/subscribe` and `/push/subscribe` (DELETE) have `pushLimiter` applied. The `markAsRead` and `markAllAsRead` endpoints have no rate limiting. A malicious user could rapidly call `PATCH /notifications/:id/read` or `PATCH /notifications/read-all` causing unnecessary DB writes.

---

## Minor Issues

### 16. `MESSAGE` type missing from `NotificationType`
The Prisma enum `NotificationType` and client type `NotificationType` don't include a `MESSAGE` type. Since messages don't create DB notifications (see issue #1), this is consistent, but if message notifications were to be added, the type would need extending.

### 17. Stale notification links
If a workspace, channel, or conversation referenced in a notification's `link` is deleted, clicking the notification navigates to a dead page. There's no fallback or cleanup of notification records for deleted resources.

### 18. Console.log statements in production code
Multiple files contain `console.log` statements that leak internal state:
- `push.service.ts`: endpoint prefixes, user IDs
- `notifications.service.ts`: notification creation flow
- `push.ts`: subscription flow
- `notification.handlers.ts`: incoming notification

These are useful for debugging but should be gated behind debug flags or removed.

### 19. `API_ROUTES.PUSH_UNSUBSCRIBE` shares the same URL as SUBSCRIBE
`url.ts:42`:
```typescript
PUSH_UNSUBSCRIBE: '/notifications/push/subscribe',
```

This is the same path as `PUSH_SUBSCRIBE`. While they use different HTTP methods (POST vs DELETE), the naming is confusing — one expects UNSUBSCRIBE to have `unsubscribe` in its URL.

### 20. Notification preference defaults are hardcoded in two places
`notifications.controller.ts:141-144` sets defaults:
```typescript
pushEnabled: user?.pushNotificationsEnabled ?? false,
dmNotifications: user?.dmNotifications ?? true,
mentionNotifications: user?.mentionNotifications ?? true,
channelNotifications: user?.channelNotifications ?? false,
```

`NotificationSettings.tsx:99-114` also has hardcoded defaults:
```typescript
checked={preferences?.dmNotifications ?? true}
checked={preferences?.mentionNotifications ?? true}
checked={preferences?.channelNotifications ?? false}
```

If the defaults drift, the client and server show different states.

### 21. `subscribePush` registers SW unconditionally
`push.ts:25` calls `navigator.serviceWorker.register("/sw.js")` even if already registered. The comment says "Explicitly registering service worker..." implying this is intentional, but it's called on every toggle. Redundant.

### 22. Push subscription has no expiration management
`push.service.ts:86-88` deletes subscriptions that return 410/404, but there's no periodic cleanup of stale subscriptions. Over time, the `PushSubscription` table could accumulate dead entries.

### 23. In-memory rate limiter is not cluster-safe
`rateLimiter.ts:16` uses a `Map<string, ClientHit>` in memory. This:
- Doesn't survive server restarts
- Doesn't work across multiple instances/workers
- Has no memory limit (potential DoS by filling the map with unique IPs)

This is a pre-existing issue shared with the general rate limiter, not unique to notifications.
