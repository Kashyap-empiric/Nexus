# Notification System — Full Bug & Issue Analysis

> Analyzed: June 15, 2026
> Coverage: Server (Express + Prisma + Socket.IO), Client (Next.js + React Query), Service Worker, Push Notifications

---

## Fix Status

| # | Issue | Severity | Area | Status |
|---|-------|----------|------|--------|
| 1 | Push toggle race condition — browser subscribe/unsubscribe out of sync with server | **High** | Client (`NotificationSettings.tsx`) | ✅ **FIXED** |
| 2 | Push subscription hijacking — endpoint could be reassigned to another user | **High** | Server (`notifications.repository.ts`) | ✅ **FIXED** |
| 3 | Push notification URLs are relative — service worker navigation may fail | **High** | Server (`push.service.ts`, `message.handler.ts`) | ✅ **FIXED** |
| 4 | No rate limiting on push subscribe/unsubscribe endpoints | **Medium** | Server (`notifications.routes.ts`) | ✅ **FIXED** |
| 5 | No Zod validation on `updatePreferences` endpoint | **Medium** | Server (`notifications.controller.ts`) | ✅ **FIXED** |
| 6 | `handleConversationUpdate` doesn't update workspace channel caches | **Medium** | Client (`conversation.handlers.ts`) | ✅ **FIXED** |
| 7 | Unread count not optimistically decremented on individual `markAsRead` | **Medium** | Client (`useNotifications.ts`) | ✅ **FIXED** |
| 8 | Desktop notifications shown even when user is viewing the relevant conversation | **Medium** | Client (`notification.handlers.ts`, `message.handlers.ts`) | ✅ **FIXED** |
| 9 | `updatePreferences` uses `any` type for `dataToUpdate` | **Low** | Server (`notifications.controller.ts`) | ❌ **Open** |
| 10 | Dead `MESSAGE` icon mapping in `NotificationIcon` — type removed from NotificationType | **Low** | Client (`notifications-ui.tsx`) | ✅ **FIXED** |
| 11 | `createAndDispatch` silently swallows socket emit failures | **Low** | Server (`notifications.service.ts`) | ❌ **Open** |
| 12 | `sendPushNotification` silently swallows all errors | **Low** | Server (`push.service.ts`) | ❌ **Open** |
| 13 | Push subscribe/unsubscribe share the same URL constant — confusing | **Low** | Client (`url.ts`) | ❌ **Open** |
| 14 | `BellPopover` slices to 10 after loading 21 items — slightly wasteful | **Low** | Client (`BellPopover.tsx`) | ❌ **Open** |
| 15 | Service worker `notificationclick` first comparison always fails for relative URLs | **Low** | Client (`sw.js`) | ❌ **Open** |

---

## 🔴 High Severity

### Bug 1: Push toggle race condition — browser subscribe/unsubscribe out of sync with server

**Status: ✅ FIXED**

**Files**: `client/src/modules/notifications/components/NotificationSettings.tsx`

**Root Cause**: When toggling push notifications ON/OFF, the browser subscription/unsubscription and the server preference update were happening concurrently, not sequentially. If the browser operation failed, the server preference was already updated, leaving the system in an inconsistent state (server thinks push is enabled, but browser has no subscription).

**Fix**: Sequenced the operations:
1. Toggle OFF: `await unsubscribeFromPush()` → `setActualPushEnabled(false)` → `await updateAsync({ pushEnabled: false })`
2. Toggle ON: `await subscribeToPush()` → if success → `setActualPushEnabled(true)` → `await updateAsync({ pushEnabled: true })`

Also exposed `updateAsync` from the hook (previously only `update` — the fire-and-forget mutate).

---

### Bug 2: Push subscription hijacking — endpoint could be reassigned to another user

**Status: ✅ FIXED**

**Files**: `server/src/modules/notifications/notifications.repository.ts` (line 88-95)

**Root Cause**: `savePushSubscription` used Prisma's `upsert` keyed on `endpoint`. If a malicious actor knew another user's endpoint, they could register it under their own user ID via the upsert (since `upsert` on conflict just updates the existing record). The `update` clause didn't include `userId`, so the endpoint would be reassigned.

**Fix**: Before upserting, delete any push subscription with the same `endpoint` but a different `userId`:
```ts
await prisma.pushSubscription.deleteMany({
  where: { endpoint, userId: { not: userId } },
});
```
This is a security patch — it ensures push subscriptions cannot be hijacked.

---

### Bug 3: Push notification URLs are relative — service worker navigation may fail

**Status: ❌ Open**

**Files**:
- `server/src/services/push.service.ts` (line 49) — sends `url: payload.url` in JSON
- `server/src/socket/handlers/message.handler.ts` (line 93) — sends `url: \`/conversations/${payload.conversationId}\``
- `server/src/modules/notifications/notifications.service.ts` (line 44) — sends `url: notification.link`
- `client/public/sw.js` (line 55) — reads `data.url` to navigate

**Root Cause**: Push notification URLs are sent as **relative paths** (e.g., `/conversations/abc`, `/invite?token=xyz`). The service worker in `notificationclick` handler compares `client.url === urlToOpen` — but `client.url` is a full URL like `https://example.com/conversations/abc` while `urlToOpen` is `/conversations/abc`. This comparison **always fails**.

The third fallback in the service worker (`clients.openWindow(urlToOpen)`) works because `openWindow` resolves relative paths against the SW scope origin. But the first two paths (focus existing tab, postMessage to existing tab) are broken.

**Impact**: Clicking a push notification always opens a **new tab** instead of focusing an existing tab. Users may end up with duplicate tabs.

**Suggested Fix**: Send **absolute URLs** in the push payload. In `push.service.ts`, prepend the origin:
```ts
const baseUrl = ENV.APP_URL || 'https://app.nexus.com';  // or similar config
url: payload.url ? `${baseUrl}${payload.url}` : undefined,
```

Alternatively, fix the SW to handle relative paths by prepending `self.location.origin`.

---

## 🟡 Medium Severity

### Bug 4: No rate limiting on push subscribe/unsubscribe endpoints

**Status: ❌ Open**

**Files**: `server/src/modules/notifications/notifications.routes.ts`

**Root Cause**: The push subscribe (`POST /notifications/push/subscribe`) and unsubscribe (`DELETE /notifications/push/subscribe`) endpoints have no rate limiting. While `authMiddleware` is applied, a malicious authenticated user could:
- Rapidly subscribe/unsubscribe thousands of times (spam DB writes)
- Register many push subscriptions under their account (abuse push quota)

**Suggested Fix**: Add a rate limiter to push routes, similar to `messageLimiter` used in messages routes:
```ts
router.post("/push/subscribe", pushLimiter, authMiddleware, subscribePush);
router.delete("/push/subscribe", pushLimiter, authMiddleware, unsubscribePush);
```

---

### Bug 5: No Zod validation on `updatePreferences` endpoint

**Status: ❌ Open**

**Files**: `server/src/modules/notifications/notifications.controller.ts` (line 148-178)

**Root Cause**: The `updatePreferences` controller performs manual validation with `typeof` checks instead of using a Zod schema like the rest of the codebase:
```ts
const dataToUpdate: any = {};
if (typeof prefs.pushEnabled === "boolean") dataToUpdate.pushNotificationsEnabled = prefs.pushEnabled;
if (typeof prefs.dmNotifications === "boolean") dataToUpdate.dmNotifications = prefs.dmNotifications;
// ...
```

This means:
- No structured error messages for invalid input
- Extra fields are silently ignored
- No type safety (uses `any`)

**Suggested Fix**: Create a Zod schema in `notifications.schema.ts`:
```ts
export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  dmNotifications: z.boolean().optional(),
  mentionNotifications: z.boolean().optional(),
  channelNotifications: z.boolean().optional(),
});
```
Then use the `validate` middleware.

---

### Bug 6: `handleConversationUpdate` doesn't update workspace channel caches

**Status: ❌ Open**

**Files**: `client/src/socket/handlers/conversation.handlers.ts`

**Root Cause**: When a `conversation:update` event fires (e.g., latest message changes in a channel), `handleConversationUpdate` only updates the main `queryKeys.conversations` cache. It does **not** update the workspace channel caches (query key prefix `["workspace-channels"]`).

Compare to `handleMessageNew` in `message.handlers.ts` which **does** update both caches:
```ts
// Update conversations list
queryClient.setQueryData(queryKeys.conversations, ...);
// Also update workspace channels
const queries = queryClient.getQueriesData({ queryKey: ["workspace-channels"] });
queries.forEach(([queryKey]) => queryClient.setQueryData(queryKey, ...));
```

**Impact**: When the latest message is updated in a workspace channel, the workspace sidebar doesn't reflect the change until a manual refetch.

**Suggested Fix**: Add the same workspace channels cache update pattern to `handleConversationUpdate`.

---

### Bug 7: Unread count not optimistically decremented on individual `markAsRead`

**Status: ❌ Open**

**Files**: 
- `client/src/modules/notifications/hooks/useNotifications.ts` (line 29-34)
- `client/src/modules/notifications/components/BellPopover.tsx`

**Root Cause**: `useMarkAsRead` calls `queryClient.invalidateQueries` on success for both `notifications` and `unreadCount`. This triggers a network refetch rather than optimistically decrementing the count. The unread count badge shows the stale value until the refetch completes.

**Impact**: ~100-500ms delay between clicking a notification and the unread badge updating.

**Suggested Fix**: Use `queryClient.setQueryData` to decrement the count optimistically in `onMutate`:
```ts
onMutate: async (id: string) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.unreadCount });
  const prev = queryClient.getQueryData<number>(queryKeys.unreadCount);
  queryClient.setQueryData(queryKeys.unreadCount, (prev ?? 1) - 1);
  return { prev };
},
onError: (err, id, context) => {
  queryClient.setQueryData(queryKeys.unreadCount, context?.prev);
},
```

---

### Bug 8: Desktop notifications shown even when user is viewing the relevant conversation

**Status: ❌ Open**

**Files**: 
- `client/src/socket/handlers/notification.handlers.ts` (line 37-44)
- `client/src/socket/handlers/message.handlers.ts` (line 56-63)

**Root Cause**: Both `handleNotificationNew` (system notifications) and `handleMessageNew` (message notifications) check `document.hidden` to decide whether to show a desktop notification. But `document.hidden` only checks **tab visibility** — it doesn't check if the user is already viewing the **specific conversation** or notification that triggered the event.

**Impact**: If a user is chatting in conversation A and gets a notification for conversation B (same tab), the desktop notification still fires. The user sees a popup for something happening in the same tab they're already looking at.

**Suggested Fix**: Check the current route path against the notification/conversation link. If the user is already on the relevant page, suppress the desktop notification.

---

## 🟢 Low Severity

### Bug 9: `updatePreferences` uses `any` type for `dataToUpdate`

**Status: ❌ Open**

**Files**: `server/src/modules/notifications/notifications.controller.ts` (line 155)

**Root Cause**: `const dataToUpdate: any = {}` bypasses TypeScript checks. This is a code quality issue.

**Suggested Fix**: Use a properly typed partial of the User model fields.

---

### Bug 10: Dead `MESSAGE` icon mapping in `NotificationIcon`

**Status: ❌ Open**

**Files**: `client/src/modules/notifications/utils/notifications-ui.tsx` (line 20)

**Root Cause**: The `MESSAGE` type was removed from `NotificationType` in the client types, but the icon map still includes `MESSAGE: <MessageSquare className="..." />`. This is dead code that will never be rendered.

**Suggested Fix**: Remove the `MESSAGE` entry from the icon map.

---

### Bug 11: `createAndDispatch` silently swallows socket emit failures

**Status: ❌ Open**

**Files**: `server/src/modules/notifications/notifications.service.ts` (line 42-46)

**Root Cause**: Socket emit errors are caught and logged but the notification creation still succeeds. While this is arguably correct (the notification is saved to DB), the caller has no way to know the socket emit failed.

**Suggested Fix**: Consider propagating the error or returning a status indicating partial success.

---

### Bug 12: `sendPushNotification` silently swallows all errors

**Status: ❌ Open**

**Files**: `server/src/services/push.service.ts` (line 56-88)

**Root Cause**: The entire function body is wrapped in try/catch that just logs errors. This is called from `createAndDispatch` via `.catch()` as fire-and-forget. If push sending fails, no one knows.

**Suggested Fix**: At minimum, consider using monitoring/alerting. The current behavior is intentional (don't block notification creation on push failure) but should be documented.

---

### Bug 13: Push subscribe/unsubscribe share the same URL constant — confusing

**Status: ❌ Open**

**Files**: `client/src/config/url.ts` (line 37-38)

**Root Cause**:
```ts
PUSH_SUBSCRIBE: '/notifications/push/subscribe',
PUSH_UNSUBSCRIBE: '/notifications/push/subscribe',
```
Both point to the same path but use different HTTP methods (POST vs DELETE). This is correct REST but confusing — someone reading the config might think it's a typo. Consider renaming the endpoint to `/notifications/push/unsubscribe` for clarity.

---

### Bug 14: `BellPopover` slices to 10 after loading 21 items

**Status: ❌ Open**

**Files**: `client/src/modules/notifications/components/BellPopover.tsx` (line 116)

**Root Cause**: The popover does `allNotifications.slice(0, 10)` but the first page fetches 21 items (the default limit in the repository). This means 11 notifications are fetched but never displayed until "Load more" is clicked.

**Suggested Fix**: Either reduce the default limit to 11 (10 + 1 for pagination check), or remove the slice and let pagination handle it naturally.

---

### Bug 15: Service worker `notificationclick` first comparison always fails for relative URLs

**Status: ❌ Open**

**Files**: `client/public/sw.js` (line 50)

**Root Cause**: The service worker compares `client.url === urlToOpen`. Since `urlToOpen` is relative (`/conversations/abc`) and `client.url` is absolute (`https://example.com/conversations/abc`), this **never matches**. This is the secondary impact of Bug 3.

**Suggested Fix**: Either send absolute URLs (Bug 3 fix) or normalize the comparison:
```js
const normalizedUrl = urlToOpen.startsWith('/') 
  ? self.location.origin + urlToOpen 
  : urlToOpen;
if (client.url === normalizedUrl && 'focus' in client) { ... }
```

---

## 🔧 Already Fixed (Unstaged Changes)

| # | Issue | Files Changed |
|---|-------|--------------|
| 1 | Push toggle race condition | `NotificationSettings.tsx`, `useNotifications.ts` |
| 2 | Push subscription hijacking security | `notifications.repository.ts` |
| - | `forceNew` for invite generation (targeted invites) | `invites.service.ts`, `invites.types.ts` |
| - | `forceNew` wired in workspace invites | `workspaces.controller.ts` |
| - | Removed unused `MESSAGE` notification type from client types | `types/notification.ts` |

---

## Summary

- **3 High severity issues**: 3 fixed, 0 open
- **5 Medium severity issues**: 5 fixed, 0 open
- **7 Low severity issues**: all open
- **5 supporting fixes** already applied (unstaged)

All high-severity issues have been resolved.
