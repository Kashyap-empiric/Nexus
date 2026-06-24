# Feature: Message Threads

## Positive Tests
- [ ] Can create a thread from any message (Reply in Thread action)
- [ ] Can view thread replies in dedicated ThreadPanel
- [ ] Thread replies appear with connector line aligned to avatar
- [ ] Thread reply count increments on new reply
- [ ] Optimistic update shows thread reply immediately (70% opacity)
- [ ] Server confirms thread reply — opacity normalizes, tempId replaced
- [ ] Thread broadcasts to main channel when `isThreadBroadcast` is true
- [ ] ThreadPanel shows root message context at top
- [ ] ThreadPanel loads paginated replies with cursor pagination
- [ ] Pinned messages sorted chronologically in pins panel

## Negative Tests
- [ ] Non-member cannot view thread messages (403)
- [ ] Invalid thread rootId returns 404
- [ ] Cannot reply to a thread in a conversation you don't belong to
- [ ] Empty thread shows "No replies yet" state
- [ ] Rate limiting applies to thread message sends (20/min)

## API Verification
- [ ] `GET /api/messages/thread/:rootId` returns 200 with messages + rootMessage + nextCursor
- [ ] `GET /api/messages/thread/:rootId` returns 403 for non-members
- [ ] `GET /api/messages/thread/:rootId` returns 404 for non-existent rootId
- [ ] `POST /api/conversations/:id/messages` accepts `threadRootId` field
- [ ] `POST /api/conversations/:id/messages` with `threadRootId` increments threadReplyCount

## Database Verification
- [ ] `Message.threadRootId` references correct root message
- [ ] `Message.threadReplyCount` increments correctly
- [ ] `Message.lastThreadReplyAt` updates on new reply
- [ ] `Message.isThreadBroadcast` defaults to false
- [ ] `@@index([threadRootId, createdAt])` exists for efficient queries
- [ ] Migration is purely additive

## UI Verification
- [ ] Desktop layout: ThreadPanel shows as right side panel
- [ ] Mobile layout: ThreadPanel shows as drawer/sheet
- [ ] Loading state for thread replies
- [ ] Empty state: "No replies yet. Reply to start the thread."
- [ ] Error state on failed thread load
- [ ] Dark mode: thread connector lines visible and aligned
- [ ] ThreadPanel closes on Escape key

## Socket Events
- [ ] `threadMessage:new` event fires on new thread reply
- [ ] Client receives thread replies in real-time
- [ ] Optimistic update reconciled with server response

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
