# Feature: Direct Messaging

## Positive Tests
- [ ] Can create a DM with another user
- [ ] Duplicate DM returns existing conversation
- [ ] Can send a message
- [ ] Message appears instantly (optimistic UI)
- [ ] Other user sees message in real-time (socket)
- [ ] Can edit own message
- [ ] Can delete own message (soft delete)
- [ ] Message history loads with pagination (scroll up)
- [ ] Read receipt shows when other user reads

## Negative Tests
- [ ] Cannot send empty message
- [ ] Cannot edit another user's message
- [ ] Cannot delete another user's message
- [ ] Cannot send message to self
- [ ] Rate limiting applied (20 messages/min)

## API Verification
- [ ] `POST /api/conversations` returns 201
- [ ] `POST /api/conversations/:id/messages` returns 201
- [ ] `PATCH /api/conversations/:id/messages/:id` returns 200
- [ ] `DELETE /api/conversations/:id/messages/:id` returns 200
- [ ] `GET /api/conversations/:id/messages?cursor=` returns paginated results

## Database Verification
- [ ] Message row created with UUIDv7 ID
- [ ] Conversation updatedAt and latestMessageId updated
- [ ] Soft-deleted message has deletedAt set
- [ ] Edited message has isEdited=true

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state (skeleton)
- [ ] Empty state ("No messages yet")
- [ ] Error state
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] API 404 errors show not found
- [ ] Rate limit (429) shows "Too many messages" message
- [ ] Network failures show retry option

## Demo Preparation

### Demo Flow
1. Open DM with another user — message list loads
2. Send a message — appears instantly (optimistic UI)
3. Other user sees message in real-time
4. Edit a message — updates for both users
5. Delete a message — soft-deleted, shown as deleted
6. Scroll up — older messages load via cursor pagination

### Test Accounts
- Two active user accounts in different browsers/tabs
- At least 50 messages in a conversation for pagination test

### Expected Results
- Messages appear instantly for sender
- Messages appear in real-time for recipient
- Edits sync to all clients
- Deleted messages show "deleted" state
- Infinite scroll loads older messages

## Architecture Explanation

### Design Decisions
- Optimistic UI via TanStack Query cache update + Socket.io ack callback replaces tempId with real ID
- Cursor pagination using UUIDv7 IDs (no offset/page number instability)
- Soft deletes preserve data integrity and allow undo

### Data Flow
Client → Socket.io emit → Server auth → Handler → Prisma transaction → Dispatcher → Room broadcast + ack to sender

### API Flow
- `GET .../messages?cursor=` — cursor-based pagination
- `POST .../messages` — send (also triggers socket emit)
- `PATCH .../messages/:id` — edit
- `DELETE .../messages/:id` — soft-delete

### Database Interactions
- `Message` table: indexed on `(conversationId, id)` for pagination queries
- `deletedAt` filtered in all queries (`WHERE deletedAt IS NULL`)
- `conversation.updatedAt` and `latestMessageId` updated on each send

### Permission Model
- Only message author can edit/delete
- Only conversation members can read/send

### Tradeoffs
- Socket.io dual-delivery (ack + broadcast) adds complexity but ensures both sender and recipients get the event
- Push notifications add 50–150ms latency to message send (in same request path)

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| Channel read receipts not working | `partnerLastReadMessageId` undefined for channels | 2026-06-11 |
| Message search uses LIKE %query% | No full-text search index — degrades at 50K+ messages | 2026-06-11 |

## AI Usage Report

### Scope
Messaging module — send, edit, delete, paginate messages

### Files Modified
- Message components, hooks (client)
- Message routes, controller, service, repository (server)
- Socket dispatcher, event handlers

### Decisions Made
- UUIDv7 for cursor pagination instead of offset-based
- Soft deletes instead of hard deletes

### Risks
- Push notifications synchronous in request path
- No React.memo on message list items

### Follow-up Work
- Add full-text search index
- Fix channel read receipts
- Decouple push notifications into background job

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
