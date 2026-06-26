# Feature: Message Threads

## Status
| Sub-feature | Status |
|---|---|
| ThreadPanel (root context, reply list, input) | ✅ Complete |
| Optimistic thread replies (70% opacity pending state) | ✅ Complete |
| Thread connector lines aligned with avatars | ✅ Complete |
| Consecutive sender grouping with rounded bottom connectors | ✅ Complete |
| Channel-level thread browser (InfoPanel Threads tab) | ✅ Complete |
| Workspace-level threads page (card-based feed) | ✅ Complete |
| Thread summaries API + TanStack Query hooks | ✅ Complete |
| Message actions toolbar on thread replies (copy/edit/delete) | ✅ Complete |
| Delete confirmation AlertDialog on thread messages | ✅ Complete |
| Thread panel as right-side detail pane | ✅ Complete |
| Discord-style ThreadIcon component | ✅ Complete |
| Formatting toolbar in edit mode | ✅ Complete |
| Editor consolidation (reusable MessageInput) | ✅ Complete |
| Thread notifications (THREAD_REPLY type) | ✅ Complete |
| Thread subscriptions (explicit follow/unfollow) | ❌ Deferred |
| Thread unread indicators | ❌ Deferred |
| Reactions endpoints and UI | ❌ Not started |
| Mention autocomplete and highlighting | ❌ Not started |

## Positive Tests
- [ ] Can create a thread from any message (Reply in Thread action)
- [ ] Can view thread replies in dedicated ThreadPanel
- [ ] Thread replies appear with connector line aligned to avatar
- [ ] Consecutive replies from same sender grouped with rounded connector termination
- [ ] Thread reply count increments on new reply
- [ ] Optimistic update shows thread reply immediately (70% opacity)
- [ ] Server confirms thread reply — opacity normalizes, tempId replaced
- [ ] Optimistic reply replaces pending placeholder (not duplicated)
- [ ] Thread broadcasts to main channel when `isThreadBroadcast` is true
- [ ] ThreadPanel shows root message context at top
- [ ] ThreadPanel loads paginated replies with cursor pagination
- [ ] Pinned messages sorted chronologically in pins panel
- [ ] Workspace threads page shows active threads with channel pills, participant avatars, reply counts
- [ ] Channel Threads browser in InfoPanel shows thread summaries
- [ ] Message actions toolbar (copy/edit/delete) appears on thread reply hover
- [ ] Delete confirmation AlertDialog on thread replies
- [ ] Formatting toolbar available in edit mode
- [ ] Edit button hidden for optimistic/pending thread replies
- [ ] Thread icon replaces MessageSquare across the app

## Negative Tests
- [ ] Non-member cannot view thread messages (403)
- [ ] Invalid thread rootId returns 404
- [ ] Cannot reply to a thread in a conversation you don't belong to
- [ ] Empty thread shows "No replies yet" state
- [ ] Rate limiting applies to thread message sends (20/min)
- [ ] Pending optimistic replies not editable

## API Verification
- [ ] `GET /api/messages/thread/:rootId` returns 200 with messages + rootMessage + nextCursor
- [ ] `GET /api/messages/thread/:rootId` returns 403 for non-members
- [ ] `GET /api/messages/thread/:rootId` returns 404 for non-existent rootId
- [ ] `POST /api/conversations/:id/messages` accepts `threadRootId` field
- [ ] `POST /api/conversations/:id/messages` with `threadRootId` increments threadReplyCount
- [ ] Thread summaries API returns thread activity per conversation
- [ ] Thread summary counts returns unread thread counts

## Database Verification
- [ ] `Message.threadRootId` references correct root message
- [ ] `Message.threadReplyCount` increments correctly
- [ ] `Message.lastThreadReplyAt` updates on new reply
- [ ] `Message.isThreadBroadcast` defaults to false
- [ ] `@@index([threadRootId, createdAt])` exists for efficient queries
- [ ] Migration is purely additive

## UI Verification
- [ ] Desktop layout: ThreadPanel shows as right side panel (in right pane mode)
- [ ] Mobile layout: ThreadPanel shows as drawer/sheet
- [ ] Workspace threads page renders card-based layout
- [ ] Loading state for thread replies
- [ ] Empty state: "No replies yet. Reply to start the thread."
- [ ] Error state on failed thread load
- [ ] Dark mode: thread connector lines visible and aligned
- [ ] ThreadPanel closes on Escape key
- [ ] Hover actions toolbar visible on thread reply hover
- [ ] Formatting toolbar visible in edit mode
- [ ] Pending thread replies show 70% opacity

## Socket Events
- [ ] `threadMessage:new` event fires on new thread reply
- [ ] Client receives thread replies in real-time
- [ ] Optimistic update reconciled with server response
- [ ] Thread root metadata (replyCount, lastReplyAt) updated on new reply

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
