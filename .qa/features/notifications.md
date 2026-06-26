# Feature: Notifications

## Positive Tests
- [ ] Bell icon shows unread count badge in NavigationRail
- [ ] BellPopover dropdown lists recent notifications with type-specific icons
- [ ] Can mark single notification as read
- [ ] Can mark all notifications as read
- [ ] Notifications page shows full history with infinite scroll
- [ ] New notification triggers in-app toast/popover update via socket
- [ ] Web Push subscription works (browser prompts for permission)
- [ ] Push notifications delivered when tab is in background
- [ ] Notification preferences page allows toggling push/DM/mention/channel

## Negative Tests
- [ ] Clicking notification navigates to correct conversation
- [ ] Notifications for own actions are not created
- [ ] Invalid push subscription data rejected
- [ ] Unauthorized access to preferences returns 401

## API Verification
- [ ] `GET /api/notifications` returns 200 with paginated data
- [ ] `GET /api/notifications/unread-count` returns 200 with count
- [ ] `PATCH /api/notifications/:id/read` returns 200
- [ ] `PATCH /api/notifications/read-all` returns 200
- [ ] `POST /api/notifications/push/subscribe` returns 201
- [ ] `DELETE /api/notifications/push/subscribe` returns 200
- [ ] `GET /api/notifications/preferences` returns 200
- [ ] `PUT /api/notifications/preferences` returns 200

## Database Verification
- [ ] Notification rows created for invite/mention/channel events
- [ ] Notification marked read correctly
- [ ] PushSubscription rows created/updated correctly
- [ ] Notification cleanup on cascade (workspace deletion, etc.)

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] BellPopover loading state
- [ ] Empty state ("No notifications yet")
- [ ] Error state
- [ ] Dark mode
- [ ] Animation on new notification
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] Unauthorized push subscription rejected
- [ ] Invalid push endpoint handled gracefully

## Demo Preparation

### Demo Flow
1. Trigger a notification (e.g., invite sent to user)
2. Bell icon shows unread badge count
3. Open BellPopover — notification listed with type-specific icon
4. Mark one as read — badge count decrements
5. Mark all as read — badge disappears
6. Open full notifications page — infinite scroll loads history

### Test Accounts
- User with pending invites and channel notifications
- User with no notifications (for empty state)

### Expected Results
- Bell badge updates in real-time via socket
- BellPopover shows recent notifications with correct icons
- Marking read updates state and persists
- Notifications page loads paginated history

## Architecture Explanation

### Design Decisions
- Dual-delivery: notifications persisted to DB AND delivered via Socket.io for instant UI update
- Push notifications use VAPID protocol (no vendor lock-in to FCM/APNs)
- Notification preferences stored as JSON in PushSubscription model

### Data Flow
Server event → NotificationService.createNotification() → DB insert + Socket.io emit + Push delivery (if subscribed and applicable)

### API Flow
- `GET /api/notifications` — paginated list
- `PATCH .../notifications/:id/read` — mark one read
- `PATCH .../notifications/read-all` — mark all read
- `POST .../push/subscribe` — subscribe to push
- `PUT .../notifications/preferences` — update preferences

### Database Interactions
- `Notification` table: indexed on `(userId, read, createdAt)` for unread queries
- `PushSubscription` table: unique on `endpoint`, indexed on `userId`

### Permission Model
- Users can only read their own notifications
- Push subscriptions scoped to user

### Tradeoffs
- Push notifications are now fully async via BullMQ (decoupled from request path) - Jun 2026
- N+1 query pattern for push delivery — queries each member individually

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| Push notifications block the request path | ✅ Resolved — moved to BullMQ async processing | 2026-06-23 |
| N+1 push queries per message send | Batch with WHERE userId IN (...) | 2026-06-15 |
| No pushsubscriptionchange handler | Subscriptions may go stale | 2026-06-15 |

## AI Usage Report

### Scope
Notifications — in-app notifications, push notifications, preferences

### Files Modified
- Notification components, hooks, utils (client)
- Notification routes, controller, service, schema (server)
- Push notification service (server)

### Decisions Made
- VAPID over FCM for vendor independence
- In-app + push parallel delivery

### Risks
- N+1 queries in push delivery (batch with WHERE IN pending)
- No pushsubscriptionchange handler (subscriptions may go stale)

### Follow-up Work
- Batch push queries with WHERE IN
- Add pushsubscriptionchange handler in service worker

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
