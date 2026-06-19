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

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
