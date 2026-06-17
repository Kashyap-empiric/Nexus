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

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
