# Feature: Messaging

## Goal

Allow users to send, edit, delete, and paginate messages in both direct messages (DMs) and channels. Messages are delivered in real-time via Socket.io with optimistic UI updates.

---

## Current Status

```
Implemented
```

Full messaging system with send (via socket + HTTP), edit, soft-delete, cursor-based pagination, optimistic UI, real-time delivery, reply-to, thread support, read receipts, and push notifications.

---

## High-Level Summary

- Messages are sent via Socket.io (`MESSAGE_SEND` event) with an ack callback for tempId replacement.
- HTTP endpoints exist for fallback: `POST /conversations/:id/messages`.
- Optimistic UI: messages appear instantly with pending state, replaced with server-confirmed ID.
- Cursor pagination using UUIDv7 IDs (no offset/page number instability).
- Soft deletes: `deletedAt` field set, content cleared, message remains with "deleted" state.
- Message editing: only own messages, `isEdited` flag set, content updated.
- Reply-to: messages reply to a parent message with context header.
- Thread support: `threadRootId` for nesting, `threadReplyCount` counter.
- Read receipts: `lastReadMessageId` on ConversationMember updated via `PATCH /conversations/:id/read`.
- Push notifications: sent async via BullMQ for DM and channel messages.
- Rate limiting: 20 messages per minute per IP.
- Content limits: 1-2000 characters.

---

## Code Locations

```
Backend

server/src/modules/messages/messages.service.ts      — Business logic
server/src/modules/messages/messages.repository.ts   — Prisma queries
server/src/modules/messages/messages.controller.ts   — Request handlers
server/src/modules/messages/messages.routes.ts       — Route definitions
server/src/modules/messages/messages.schema.ts       — Zod validation
server/src/modules/messages/messages.types.ts        — TypeScript types
server/src/modules/messages/messages.search.routes.ts — Search routes
server/src/socket/handlers/message.handler.ts        — Socket message handlers
server/src/socket/socket.dispatcher.ts               — Socket dispatch
server/src/middlewares/rateLimiter.ts                — Message rate limiter

Database

server/prisma/schema.prisma

Frontend

client/src/modules/messages/hooks/useMessages.ts              — Message mutations/queries
client/src/modules/messages/hooks/useOptimisticMessage.ts     — Optimistic state hook
client/src/modules/messages/hooks/useMessageSearch.ts         — Search hook
client/src/modules/messages/api/messages.api.ts               — API client
client/src/modules/messages/types/message.ts                  — Types
client/src/modules/messages/components/MessageList.tsx         — Message list
client/src/modules/messages/components/MessageGroupItem.tsx    — Grouped messages
client/src/modules/messages/components/MessageInput.tsx        — Message input
client/src/modules/messages/components/MessageStatus.tsx       — Read status
client/src/modules/messages/components/EditMessageForm.tsx     — Edit form
client/src/modules/messages/components/MarkdownRenderer.tsx    — Markdown render
client/src/modules/messages/components/LazyMarkdown.tsx        — Lazy markdown
client/src/modules/messages/components/MentionList.tsx         — Mention autocomplete
client/src/modules/messages/components/mentionSuggestion.ts    — Mention suggestion
client/src/modules/messages/components/PinButton.tsx           — Pin button
client/src/modules/messages/components/MessageListSkeleton.tsx — Loading state
client/src/modules/messages/components/MessageSearchPopover.tsx — Search popover
client/src/modules/messages/components/TypingIndicator.tsx     — Typing indicator
client/src/modules/messages/components/PinnedMessagesPanel.tsx  — Pinned panel
client/src/socket/handlers/message.handlers.ts                 — Socket handlers
```

---

## Database

```prisma
model Message {
  id                  String    @id
  content             String
  conversationId      String
  userId              String?
  displayNameSnapshot String
  avatarSnapshot      String?
  isEdited            Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?
  replyToId           String?
  replyTo             Message?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies             Message[] @relation("MessageReplies")
  threadRootId        String?
  threadRoot          Message?  @relation("ThreadMessages", fields: [threadRootId], references: [id])
  threadReplies       Message[] @relation("ThreadMessages")
  threadReplyCount    Int       @default(0)
  lastThreadReplyAt   DateTime?
  isThreadBroadcast   Boolean   @default(false)
  mentions            MessageMention[]
  reactions           MessageReaction[]
  // ... relations

  @@index([conversationId, id])
  @@index([threadRootId, createdAt])
}
```

- UUIDv7 IDs enable cursor-based pagination (time-ordered).
- `deletedAt` filtered in all queries (`WHERE deletedAt IS NULL`).
- `isThreadBroadcast` distinguishes main channel messages from thread-only replies.
- `userId` nullable — set to null when user is deleted.
- Conversation `latestMessageId` updated on each send, recalculated on delete.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/conversations/:conversationId/messages` | Required | Paginated messages |
| POST | `/conversations/:conversationId/messages` | Required | Send message (HTTP) |
| PATCH | `/conversations/:conversationId/messages/:messageId` | Required | Edit message |
| DELETE | `/conversations/:conversationId/messages/:messageId` | Required | Soft-delete message |
| GET | `/conversations/:conversationId/messages/:messageId/thread` | Required | Get thread replies |
| GET | `/messages/search?q=` | Required | Search messages |

### Request Validation

```typescript
createMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
  replyToId: z.uuid().optional(),
  threadRootId: z.uuid().optional(),
  isThreadBroadcast: z.boolean().optional(),
});

updateMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
```

### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `message:send` | Client→Server | Send message via socket |
| `message:new` | Server→Client | New message broadcast |
| `message:update` | Server→Client | Updated message broadcast |
| `message:delete` | Server→Client | Deleted message broadcast |
| `message:read` | Server→Client | Read receipt broadcast |
| `typing:start` | Bidirectional | Typing indicator start |
| `typing:stop` | Bidirectional | Typing indicator stop |

### Permissions

- Must be a conversation member (enforced by `requireConversationMember`).
- Only message author can edit/delete.
- Rate limit: 20 messages/min (messageLimiter).

---

## Backend Implementation

### Message Service (`server/src/modules/messages/messages.service.ts`)

- **`getMessages()`**: Cursor-based pagination with pinned message IDs.
- **`createMessage()`**:
  1. Generates UUIDv7 message ID.
  2. Fetches user display name and avatar snapshots.
  3. Validates replyTo and threadRoot constraints.
  4. Parses @mentions from content (creates `MessageMention` rows).
  5. Runs transaction: create message, update thread reply count, update conversation metadata, update sender's lastReadMessageId, create mention records.
  6. Dispatches reply notification to parent message author (if replying).
  7. Dispatches mention notifications to mentioned users.
- **`editMessage()`**: Validates ownership, updates content, sets `isEdited: true`.
- **`deleteMessage()`**: Soft deletes, recalculates `latestMessageId`, decrements `threadReplyCount` if thread reply, cascade soft-deletes all thread replies if deleting thread root.
- **`sendMessageNotifications()`**: Enqueues `push-to-members` BullMQ job.

### Socket Handler (`server/src/socket/handlers/message.handler.ts`)

- **MESSAGE_SEND**: Receives payload (tempId, conversationId, content, replyToId, threadRootId), verifies auth and membership, calls `createMessage`, dispatches `MESSAGE_NEW`, enqueues push notifications, returns ack with server Message.
- **TYPING_START/TYPING_STOP**: Relays typing indicator to conversation room.

### Rates

- 20 messages per minute per IP (`MESSAGE_RATE_LIMIT_WINDOW_MS`, `MESSAGE_RATE_LIMIT_MAX` from env).

---

## Frontend Implementation

### useMessages (`client/src/modules/messages/hooks/useMessages.ts`)

- **`useMessagesInfiniteQuery()`**: Infinite query with cursor pagination.
- **`useSendMessageMutation()`**: Emits `MESSAGE_SEND` socket event.
  - `onMutate`: Creates optimistic message with tempId, adds to cache for both main list and thread data.
  - `onSuccess`: Replaces tempId with real message in cache, removes duplicate.
  - `onError`: Rolls back cache, shows toast with friendly error.
- **`useEditMessageMutation()`**: Calls HTTP PATCH, updates cache optimistically for both main list and thread.
- **`useDeleteMessageMutation()`**: Calls HTTP DELETE, updates cache optimistically, decrements threadReplyCount if applicable.

### MessageList (`client/src/modules/messages/components/MessageList.tsx`)

- Infinite scroll using IntersectionObserver.
- Groups consecutive messages from same user.
- Unread divider (New) based on `lastReadMessageId`.
- Scroll-to-bottom button with new message indicator.
- Highlight scroll for pinned message navigation.

### MessageGroupItem (`client/src/modules/messages/components/MessageGroupItem.tsx`)

- Avatar, username, timestamp for first message in group.
- Reply context header with scroll-to-parent.
- Thread broadcast header.
- Thread reply count button with "X replies, Last reply X ago".
- Hover actions toolbar: Reply, Reply in thread, Pin, Copy, Edit, Delete, More.
- Right-click/Dropdown context menu with same actions.
- Edit mode with inline EditMessageForm.
- Delete confirmation with AlertDialog.
- Optimistic message opacity (70% for pending).

### MessageInput (`client/src/modules/messages/components/MessageInput.tsx`)

- TipTap rich text editor with Markdown support.
- Formatting toolbar: Bold, Italic, Code, Strike, Bullet List, Ordered List, Emoji.
- Enter to submit (Shift+Enter for newline).
- Draft persistence via Zustand store across conversation switches.
- Reply preview bar.
- Typing indicator emission (start/stop with 1.5s debounce).
- @mention autocomplete via Tiptap Mention extension (`MentionList` + `mentionSuggestion`).

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Send message (socket) | ✅ | `MESSAGE_SEND` handler in message.handler.ts |
| Send message (HTTP fallback) | ✅ | `POST /messages` in controller |
| Optimistic UI | ✅ | `onMutate` in useSendMessageMutation |
| Edit message | ✅ | `editMessage` in service + `PATCH` endpoint |
| Delete message (soft) | ✅ | `deleteMessage` with deletedAt |
| Cursor pagination | ✅ | UUIDv7 cursor in `getMessages` |
| Reply-to messages | ✅ | `replyToId` field + UI header |
| Read receipts | ✅ | `lastReadMessageId` + `message:read` event |
| Typing indicators | ✅ | TYPING_START/STOP socket events |
| Message search | ✅ | `searchMessages` with `LIKE %query%` |
| Message rate limiting | ✅ | `messageLimiter` middleware |
| Content limits (1-2000) | ✅ | Zod min/max validation |
| Push notifications for messages | ✅ | `sendMessageNotifications` → BullMQ |
| Thread replies | ✅ | `threadRootId` support |
| Markdown rendering | ✅ | react-markdown with remark-gfm |
| Message search full-text index | ❌ | Uses `LIKE %query%` |
| Channel read receipts | ⚠️ | `partnerLastReadMessageId` undefined for channels |
| Message reactions | ❌ | Schema exists, no endpoints or UI |
| @mention autocomplete | ✅ | Tiptap Mention extension, MentionList dropdown, mentionSuggestion plugin |
| Client-side message rendering | ✅ | MarkdownRenderer, LazyMarkdown |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Send message | Instant optimistic appearance, socket broadcast | Optimistic in cache, MESSAGE_NEW broadcast | ✅ |
| Send empty message | Rejected (min 1 char) | Zod validation rejects | ✅ |
| Send message > 2000 chars | Rejected | Zod max(2000) rejects | ✅ |
| Send message to conversation not a member | 403 forbidden | `requireConversationMember` middleware | ✅ |
| Send messages rapidly (21/min) | 429 rate limited | `messageLimiter` returns 429 | ✅ |
| Edit own message | Content updated, isEdited set | `editMessage` sets `isEdited: true` | ✅ |
| Edit another user's message | 403 forbidden | `userId` ownership check | ✅ |
| Delete own message | Soft deleted, content cleared | `deletedAt` set, content cleared | ✅ |
| Delete another user's message | 403 forbidden | Ownership check | ✅ |
| Delete thread root message | All thread replies also soft-deleted | Cascade in `deleteMessage` | ✅ |
| Delete thread reply message | threadReplyCount decremented | `decrement: 1` on root | ✅ |
| Read receipt on new message | `lastReadMessageId` updated | `PATCH /conversations/:id/read` | ✅ |
| Reply to message | Reply context shown in UI | `replyToId` in payload + UI header | ✅ |
| Scroll up to load older messages | Cursor pagination fetches more | Infinite query with `nextCursor` | ✅ |
| Rate limit exceeded | 429 "Too many messages" | `messageLimiter` returns 429 | ✅ |
| Network failure during send | Error toast with rollback | `onError` rolls back optimistic update | ✅ |

---

## Current Flow

```
Send message (socket):
  Client types message → submit
  → Optimistic: add to cache with tempId, pending=true
  → Socket emit MESSAGE_SEND { tempId, conversationId, content }
  → Server: authMiddleware → verifyMembership → createMessage (transaction)
  → Dispatch MESSAGE_NEW to conversation room
  → Enqueue push notifications (BullMQ)
  → Server returns ack with Message object
  → Client: replace tempId with real message, remove pending state

Edit message:
  Client → PATCH /conversations/:id/messages/:msgId
  → authMiddleware → validate → requireConversationMember
  → editMessage: verify ownership → update content + isEdited
  → dispatchMessageEvent("UPDATE")
  → Client cache updated

Delete message:
  Client → DELETE /conversations/:id/messages/:msgId
  → authMiddleware → validate → requireConversationMember
  → deleteMessage: soft delete → recalculate latestMessage → cascade thread deletes
  → dispatchMessageEvent("DELETE")
  → Client cache updated
```

---

## Missing Pieces

```
□ Full-text search index for message search (currently LIKE %query%)
□ Channel-level read receipts (partnerLastReadMessageId currently only works for DMs)
□ Message reactions (schema exists, no endpoints or UI)
□ Message bookmarking (different from pins)
□ Message translation
□ File/image upload in messages (no upload component in message input)
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Delete message while offline | Optimistic update fails, error toast | ✅ |
| Edit deleted message | 400 "Cannot edit a deleted message" | ✅ |
| Delete already-deleted message | 400 "Message is already deleted" | ✅ |
| Reply to deleted message | Reply context shows "[Message deleted]" | ✅ |
| Send message to deleted conversation | 404 (via middleware) | ✅ |
| Very long message (2000+ chars) | Zod validation rejects | ✅ |
| Concurrent edit+delete | Race condition — last operation wins | ⚠️ |
| Send message with only whitespace | `.trim()` results in empty → rejected | ✅ |

---

## Known Limitations

- Channel read receipts not working — `partnerLastReadMessageId` is undefined for channels (read count display uses `readCount` from members).
- Message search uses `LIKE %query%` (no full-text search index) — degrades at 50K+ messages.
- No message reactions — `MessageReaction` schema exists but endpoints and UI are not implemented.
- No file/image attachment support in message input.
- Push notifications for messages are still processed synchronously in the request path at the controller level (service method `sendMessageNotifications` is async but called without await in controllers).

---

## Files Inspected

```
server/src/modules/messages/messages.service.ts
server/src/modules/messages/messages.repository.ts
server/src/modules/messages/messages.controller.ts
server/src/modules/messages/messages.routes.ts
server/src/modules/messages/messages.schema.ts
server/src/modules/messages/messages.types.ts
server/src/modules/messages/messages.search.routes.ts
server/src/socket/handlers/message.handler.ts
server/src/socket/socket.dispatcher.ts
server/src/middlewares/rateLimiter.ts
server/prisma/schema.prisma
client/src/modules/messages/hooks/useMessages.ts
client/src/modules/messages/hooks/useOptimisticMessage.ts
client/src/modules/messages/hooks/useMessageSearch.ts
client/src/modules/messages/api/messages.api.ts
client/src/modules/messages/types/message.ts
client/src/modules/messages/components/MessageList.tsx
client/src/modules/messages/components/MessageGroupItem.tsx
client/src/modules/messages/components/MessageInput.tsx
client/src/modules/messages/components/MessageStatus.tsx
client/src/modules/messages/components/EditMessageForm.tsx
client/src/modules/messages/components/MarkdownRenderer.tsx
client/src/modules/messages/components/LazyMarkdown.tsx
client/src/modules/messages/components/MentionList.tsx
client/src/modules/messages/components/mentionSuggestion.ts
client/src/socket/handlers/message.handlers.ts
```
