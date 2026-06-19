# Feature: Pinned Messages

## Positive Tests
- [ ] Can pin a message in a channel (workspace owner/admin)
- [ ] Can unpin a message
- [ ] Pinned messages appear in InfoPanel > Pins tab
- [ ] Pin icon visible on message hover after pinning
- [ ] Pinned messages update in real-time via socket events
- [ ] Clicking a pinned message scrolls to the original message
- [ ] Mobile users can pin/unpin via message context menu

## Negative Tests
- [ ] Cannot pin a message in a DM (non-workspace)
- [ ] Regular MEMBER cannot pin messages
- [ ] Cannot pin already-pinned message
- [ ] Cannot pin soft-deleted message
- [ ] Unpinning removes from list immediately

## API Verification
- [ ] `POST /api/conversations/:id/pins/:messageId` returns 201
- [ ] `DELETE /api/conversations/:id/pins/:messageId` returns 200
- [ ] `GET /api/conversations/:id/pins` returns 200 with list
- [ ] 403 for non-admin pin attempt
- [ ] 400 for duplicate pin

## Database Verification
- [ ] PinnedMessage row created
- [ ] PinnedMessage row deleted on unpin
- [ ] MessageId unique constraint enforced
- [ ] No orphaned pinned messages on message soft-delete

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state for pins list
- [ ] Empty state ("No pinned messages")
- [ ] Pin icon animation
- [ ] Dark mode

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
