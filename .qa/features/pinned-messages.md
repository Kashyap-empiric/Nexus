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
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 for non-admin pin attempt shown correctly
- [ ] API 400 for duplicate pin shown correctly
- [ ] Cannot pin already-deleted message

## Demo Preparation

### Demo Flow
1. Open a channel as workspace ADMIN
2. Hover over a message — pin icon appears
3. Click pin — message appears in Pins tab of InfoPanel
4. View Pins tab — pinned message listed with pinner info
5. Click pinned message — scrolls to original message
6. Unpin — message removed from Pins list in real-time
7. Attempt pin as MEMBER — blocked

### Test Accounts
- Workspace ADMIN account (can pin)
- Workspace MEMBER account (cannot pin)

### Expected Results
- ADMIN can pin/unpin messages
- Pins appear in InfoPanel immediately
- Clicking pin scrolls to original message
- Pin/unpin syncs via socket events
- MEMBER sees pin icon but action is disabled/blocked

## Architecture Explanation

### Design Decisions
- Pins stored in dedicated `PinnedMessage` table (not metadata on Message)
- One pin per message enforced by unique constraint on `messageId`
- Pins survive message edits but cascade-deleted with message or conversation
- Pin events dispatched via socket for real-time sync

### Data Flow
Client → REST → Controller → Service → PinnedMessage table + Socket dispatcher → conversation room broadcast

### API Flow
- `POST /api/conversations/:id/pins/:messageId` — pin
- `DELETE /api/conversations/:id/pins/:messageId` — unpin
- `GET /api/conversations/:id/pins` — list pins

### Database Interactions
- `PinnedMessage` table: FK to Message and Conversation
- Unique constraint on `messageId` (one pin per message)
- Cascade delete on message/conversation deletion

### Permission Model
- Channel members can view pins
- ADMIN/OWNER can pin/unpin
- MEMBER cannot pin (permission enforced server-side)

### Tradeoffs
- No pin ordering — displayed by most recently pinned
- Pin limit not enforced (any number of pins per channel)

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No pin limit per channel | Could be abused for spam | 2026-06-11 |
| No custom pin sorting | Only reverse chronological order | 2026-06-11 |

## AI Usage Report

### Scope
Pinned messages — pin, unpin, list, real-time sync

### Files Modified
- PinnedMessagesPanel, MessageGroupItem (client)
- Pin routes, controller, service (server)
- Socket dispatcher, event handlers

### Decisions Made
- Dedicated PinnedMessage table instead of flag on Message
- Socket events for real-time pin/unpin sync

### Risks
- No pin limit — users could pin unlimited messages

### Follow-up Work
- Add configurable pin limit per channel
- Add pin reordering capability

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
