# Feature: Threads

## Goal

Allow users to create threaded conversations from any message, view and reply within dedicated thread panels, browse active threads at the channel and workspace level, and receive notifications for thread replies.

---

## Current Status

```
Mostly Implemented
```

Thread creation, reply, panel UI, channel/workspace-level browsing, optimistic updates, and notifications are all implemented. Thread subscriptions (follow/unfollow) and unread indicators are deferred.

---

## High-Level Summary

- Threads created by setting `threadRootId` on a reply message.
- `threadReplyCount` and `lastThreadReplyAt` on the root message track thread activity.
- ThreadPanel shows root message context + paginated reply list + input.
- Channel-level thread browser (from InfoPanel or dedicated route) shows thread summaries.
- Workspace-level threads page shows active threads with channel pills, participant avatars, reply counts.
- Optimistic replies: appear immediately with 70% opacity, replaced on server confirmation.
- `isThreadBroadcast` flag for broadcasting thread replies to the main channel.
- THREAD_REPLY notification type exists but is NOT dispatched anywhere in the codebase.
- Thread subscriptions (explicit follow/unfollow) and unread indicators are not implemented.

---

## Code Locations

```
Backend

server/src/modules/messages/messages.service.ts      — Thread queries (getThreadMessages, getChannelThreads, getWorkspaceThreads)
server/src/modules/messages/messages.repository.ts   — Thread DB queries
server/src/modules/messages/messages.controller.ts   — Thread request handlers
server/src/modules/messages/messages.schema.ts       — threadRootId validation
server/src/modules/conversations/conversations.routes.ts — Thread routes

Database

server/prisma/schema.prisma

Frontend

client/src/modules/threads/store/threadStore.ts             — Zustand thread store
client/src/modules/threads/hooks/useThreadMessages.ts       — Thread message hook
client/src/modules/threads/components/ThreadPanel.tsx        — Thread panel UI
client/src/modules/threads/components/ThreadInput.tsx        — Thread input
client/src/modules/threads/components/ChannelThreadsBrowser.tsx — Channel thread browser
client/src/modules/threads/components/WorkspaceThreadsView.tsx  — Workspace threads page
client/src/modules/messages/hooks/useThreads.ts             — Thread summary hooks
client/src/modules/messages/api/messages.api.ts             — Thread API client
client/src/modules/messages/components/MessageGroupItem.tsx  — Thread reply button + indicator
client/src/modules/chat/components/ActiveConversation.tsx   — Thread panel integration
client/src/socket/handlers/message.handlers.ts              — Thread socket handling
```

---

## Database

```prisma
model Message {
  // ... existing fields
  threadRootId        String?
  threadRoot          Message?  @relation("ThreadMessages", fields: [threadRootId], references: [id])
  threadReplies       Message[] @relation("ThreadMessages")
  threadReplyCount    Int       @default(0)
  lastThreadReplyAt   DateTime?
  isThreadBroadcast   Boolean   @default(false)

  @@index([threadRootId, createdAt])
}
```

- `threadRootId` self-references the root message.
- `threadReplyCount` incremented/decremented on create/delete.
- `lastThreadReplyAt` updated on new reply for chronological ordering.
- `isThreadBroadcast` defaults to `false` — set to `true` when reply should also appear in main channel.
- Index on `(threadRootId, createdAt)` for efficient thread reply queries.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/conversations/:conversationId/messages/:messageId/thread` | Required | Get thread root + replies |
| GET | `/conversations/:conversationId/threads` | Required | Get channel thread summaries |
| GET | `/workspaces/:id/threads` | Required | Get workspace thread summaries |
| POST | `/conversations/:conversationId/messages` | Required | Create message (threadRootId supported) |

### Thread Data Flow

- Thread replies are fetched via `GET /messages/:messageId/thread` which returns `{ root, replies }`.
- Channel threads are fetched via `GET /conversations/:id/threads` which returns `ThreadSummary[]`.
- Workspace threads are fetched via `GET /workspaces/:id/threads` which returns `ThreadSummary[]`.
- Messages are created with `threadRootId` via the standard message creation endpoint/socket.

### Permissions

- Must be a conversation member (`requireConversationMember`).
- Thread root validation: root must exist, belong to same conversation, not be deleted, and not itself be a thread reply (no nested threads).

---

## Backend Implementation

### Thread Service (`server/src/modules/messages/messages.service.ts`)

- **`createMessage()`**: Accepts `threadRootId`. Validates root message constraints (exists, same conversation, not deleted, not itself a thread reply). Transaction increments `threadReplyCount` and updates `lastThreadReplyAt` on root.
- **`getThreadMessages()`**: Validates message is a thread root (not a reply itself), returns `{ root, replies }` ordered by createdAt asc.
- **`getChannelThreads()`**: Finds messages with `threadReplyCount > 0` (has replies) in a conversation, ordered by `lastThreadReplyAt` desc. Maps to `ThreadSummary` including last reply preview and participants.
- **`getWorkspaceThreads()`**: Finds threads across all channels in a workspace where user is a participant OR mentioned. Returns `ThreadSummary[]`.
- **`deleteMessage()`**: If deleting a thread reply, decrements `threadReplyCount` on root. If deleting a thread root, cascades soft-delete to all thread replies.

### ThreadSummary Type

```typescript
interface ThreadSummary {
  threadRootId: string;
  conversationId: string;
  rootMessagePreview: string;
  rootAuthor: { id: string; username: string; avatarUrl: string | null };
  replyCount: number;
  lastReplyAt: string;
  lastReplyPreview: string | null;
  lastReplyAuthor: { id: string; username: string; avatarUrl: string | null } | null;
  participants: { id: string; username: string; avatarUrl: string | null }[];
}
```

### Thread Notifications

- `THREAD_REPLY` notification type exists in `NotificationType` enum and `NOTIFICATION_CATEGORY_MAP` (mapped to `REPLIES` category).
- `THREAD_REPLY` notification is **NOT dispatched anywhere** in the codebase. No `createAndDispatch` call with type `THREAD_REPLY` was found.

---

## Frontend Implementation

### ThreadPanel (`client/src/modules/threads/components/ThreadPanel.tsx`)

- Right-side detail pane showing thread root message at top, reply list, and input at bottom.
- Cursor-paginated reply loading.
- Root message context (avatar, username, timestamp, content).
- Reply list with consecutive sender grouping and connector lines.
- ThreadInput at bottom for new replies.
- Close on Escape key.
- Mobile: opens as drawer/sheet.

### ChannelThreadsBrowser (`client/src/modules/threads/components/ChannelThreadsBrowser.tsx`)

- Lists thread summaries for a single channel.
- Each entry shows: root message preview, author, reply count, last reply time.
- Click opens ThreadPanel.

### WorkspaceThreadsView (`client/src/modules/threads/components/WorkspaceThreadsView.tsx`)

- Card-based feed of active threads across a workspace.
- Each card shows: root message preview, author avatar, channel pill, participant avatars, reply count.
- Click opens the conversation with thread panel.

### Optimistic Thread Replies

- `useSendMessageMutation.onMutate()`: Adds optimistic reply to thread cache with `pending: true`.
- `useSendMessageMutation.onSuccess()`: Replaces pending message with server-confirmed message.
- Pending replies shown at 70% opacity, not editable.

### Socket Handling

- Thread replies dispatched via standard `MESSAGE_NEW` event (no separate `threadMessage:new` event).
- Client maintains thread data in React Query cache alongside main message list.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Thread creation via threadRootId | ✅ | `createMessage` accepts threadRootId |
| Thread reply count tracking | ✅ | `threadReplyCount` incremented/decremented |
| ThreadPanel UI | ✅ | ThreadPanel.tsx |
| Channel thread browser | ✅ | ChannelThreadsBrowser.tsx |
| Workspace threads page | ✅ | WorkspaceThreadsView.tsx |
| ThreadSummary API | ✅ | getChannelThreads, getWorkspaceThreads |
| Optimistic thread replies | ✅ | onMutate/onSuccess in useSendMessageMutation |
| Thread reply broadcast to main channel | ✅ | isThreadBroadcast field |
| Delete thread reply (decrement count) | ✅ | deleteMessage decrements threadReplyCount |
| Delete thread root (cascade delete) | ✅ | deleteMessage cascades to all replies |
| Thread connector line UI | ✅ | CSS border-left in MessageGroupItem |
| Thread reply count button | ✅ | "X replies, Last reply X ago" button |
| THREAD_REPLY notification type | ✅ | Exists in enum and category map |
| THREAD_REPLY dispatch | ❌ | No createAndDispatch with THREAD_REPLY found |
| Thread subscriptions (follow/unfollow) | ❌ | Deferred |
| Thread unread indicators | ❌ | Deferred |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| User replies in thread | Reply created, threadReplyCount++ | Transaction increments count | ✅ |
| User views thread | Root + replies displayed in panel | getThreadMessages returns { root, replies } | ✅ |
| User browses channel threads | List of threads with summaries | getChannelThreads maps to ThreadSummary[] | ✅ |
| User browses workspace threads | Threads user participated in or mentioned | getWorkspaceThreads filters by participant/mention | ✅ |
| User broadcasts reply to main channel | Message appears in both thread + main | isThreadBroadcast=true → message shows in main list | ✅ |
| User deletes thread reply | threadReplyCount decremented | deleteMessage has `decrement: 1` | ✅ |
| User deletes thread root | All thread replies soft-deleted | Cascade in deleteMessage | ✅ |
| Non-member tries to view thread | 403 forbidden | requireConversationMember middleware | ✅ |
| Try to nest thread (reply to thread reply) | 400 error | `threadRootId !== null` check | ✅ |
| User receives thread reply notification | Notification created | THREAD_REPLY type exists but NOT dispatched | ❌ |
| Thread root not found | 404 error | NotFoundError thrown | ✅ |
| Reply to deleted thread root | 400 error | `deletedAt` check | ✅ |

---

## Current Flow

```
Create thread reply:
  User types in ThreadInput → submit
  → Optimistic: add to thread cache, pending=true
  → Socket MESSAGE_SEND { threadRootId, conversationId, content }
  → Server: createMessage with threadRootId
    1. Validate root message exists, same conversation, not deleted, not a reply
    2. Transaction: create message, increment threadReplyCount, update lastThreadReplyAt
    3. Dispatch MESSAGE_NEW to conversation room
  → Client: replace pending with real message

View thread:
  User clicks "X replies" or thread icon
  → GET /conversations/:id/messages/:messageId/thread
  → getThreadMessages: validate root, fetch replies ordered by createdAt ASC
  → ThreadPanel opens with root + replies

Browse workspace threads:
  GET /workspaces/:id/threads
  → getWorkspaceThreads:
    1. Find workspace by slug or id
    2. Find messages with threadReplyCount > 0 where user is participant/mentioned
    3. Map to ThreadSummary with last reply preview + participants
```

---

## Missing Pieces

```
□ THREAD_REPLY notification dispatch (type exists but never used)
□ Thread subscriptions (follow/unfollow a thread)
□ Thread unread indicators (count of unread replies per thread)
□ Thread reply notifications to all thread participants
□ Separate socket event for thread messages (currently uses MESSAGE_NEW)
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Nested thread (reply to thread reply) | Blocked — 400 error | ✅ |
| Delete thread root with replies | All replies soft-deleted | ✅ |
| Delete all replies → threadReplyCount = 0 | count decremented, thread still exists | ✅ |
| Reply to thread in different conversation | 400 "does not belong" | ✅ |
| Thread root deleted but replies exist | Replies visible until server cascade | ⚠️ |
| User mentioned in thread reply | Mention record created, notification sent | ✅ |
| Thread reply broadcast conflicts | isThreadBroadcast duplicates in main list | ⚠️ |

---

## Known Limitations

- `THREAD_REPLY` notification type exists in the enum and category map but is never dispatched — users do not receive notifications for thread replies.
- No thread subscription system — any conversation member can reply to any thread.
- No unread indicators for threads — users don't know if a thread has new replies.
- Thread replies use the same `MESSAGE_NEW` socket event as main messages — no separate `thread:new` event.
- Workspace threads query uses `OR` conditions that may be slow at scale.

---

## Files Inspected

```
server/src/modules/messages/messages.service.ts
server/src/modules/messages/messages.repository.ts
server/src/modules/messages/messages.controller.ts
server/src/modules/conversations/conversations.routes.ts
server/prisma/schema.prisma
server/src/modules/notifications/notifications.service.ts
client/src/modules/threads/store/threadStore.ts
client/src/modules/threads/hooks/useThreadMessages.ts
client/src/modules/threads/components/ThreadPanel.tsx
client/src/modules/threads/components/ThreadInput.tsx
client/src/modules/threads/components/ChannelThreadsBrowser.tsx
client/src/modules/threads/components/WorkspaceThreadsView.tsx
client/src/modules/messages/hooks/useThreads.ts
client/src/modules/messages/hooks/useMessages.ts
client/src/modules/messages/api/messages.api.ts
client/src/modules/messages/components/MessageGroupItem.tsx
client/src/socket/handlers/message.handlers.ts
```
