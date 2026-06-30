# Feature: Pinned Messages

## Goal

Allow workspace admins and owners to pin important messages in channels for quick reference, with real-time sync and a dedicated Pins panel.

---

## Current Status

```
Implemented
```

Full pin/unpin system with dedicated `PinnedMessage` table, REST endpoints, socket events for real-time sync, permission enforcement, and a PinnedMessagesPanel UI component.

---

## High-Level Summary

- `PinnedMessage` table stores pin records with FK to Message and Conversation.
- One pin per message enforced by unique constraint on `messageId`.
- Pin/unpin allowed only for workspace OWNER and ADMIN roles.
- Pins survive message edits but cascade-deleted with message or conversation.
- Socket events `message:pin` and `message:unpin` for real-time sync.
- PinnedMessagesPanel shows chronologically-sorted pins with unpin button.
- No pin limit per channel (unlimited pins allowed).
- No pin reordering — displayed in chronological order of original message creation.

---

## Code Locations

```
Backend

server/src/modules/messages/messages.service.ts      — pinMessage, unpinMessage, getPinnedMessages
server/src/modules/messages/messages.repository.ts   — createPin, deletePin, findPinByMessageId, getPinnedMessages, findPinnedMessageIds
server/src/modules/messages/messages.controller.ts   — pinMessage, unpinMessage, getPinnedMessages
server/src/modules/conversations/conversations.routes.ts — Pin endpoint routes
server/src/socket/socket.dispatcher.ts               — dispatchPinEvent

Database

server/prisma/schema.prisma

Frontend

client/src/modules/messages/hooks/usePinnedMessages.ts      — React Query hooks
client/src/modules/messages/api/messages.api.ts             — API client
client/src/modules/messages/components/PinnedMessagesPanel.tsx — Pins panel UI
client/src/modules/messages/components/PinButton.tsx        — Pin button
client/src/modules/messages/components/MessageGroupItem.tsx  — Pin integration
client/src/socket/handlers/message.handlers.ts              — Socket handlers
```

---

## Database

```prisma
model PinnedMessage {
  id             String       @id @default(cuid())
  messageId      String
  conversationId String
  pinnedBy       String
  createdAt      DateTime     @default(now())

  message      Message      @relation("PinToMessage", fields: [messageId], references: [id], onDelete: Cascade)
  conversation Conversation @relation("PinToConversation", fields: [conversationId], references: [id], onDelete: Cascade)
  pinnedByUser User         @relation("PinToUser", fields: [pinnedBy], references: [id])

  @@unique([messageId])
  @@index([conversationId])
}
```

- Unique constraint on `messageId` — one pin per message (no duplicate pins).
- Indexed on `conversationId` for listing pins.
- Cascade deletes: deleting message or conversation removes pin record.
- `pinnedBy` references User (not cascade-deleted — pinnedBy remains even if user is deleted).

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/conversations/:conversationId/pins/:messageId` | Required | Pin a message |
| DELETE | `/api/conversations/:conversationId/pins/:messageId` | Required | Unpin a message |
| GET | `/api/conversations/:conversationId/pins` | Required | List pinned messages |

### Request Validation

- `pinsIdParamsSchema`: conversationId (uuid), messageId (uuid).
- `pinsParamsSchema`: conversationId (uuid).

### Permissions

- Pin/Unpin: only workspace OWNER and ADMIN roles (checked via `findWorkspaceMember`).
- View pins: any conversation member.
- Non-workspace conversations (DMs): no pinning allowed (workspace check fails, returns 403).

---

## Backend Implementation

### pinMessage (`server/src/modules/messages/messages.service.ts`)

1. Verifies message exists and belongs to conversation.
2. If conversation has workspaceId, checks caller is workspace OWNER or ADMIN. Non-workspace conversations (DMs) are rejected because no workspace member row exists.
3. Checks message is not already pinned (`findPinByMessageId`).
4. Creates pin record with pinnedBy user info.
5. Dispatches `dispatchPinEvent("pin", ...)` → socket emit `MESSAGE_PIN` to conversation room.

### unpinMessage (`server/src/modules/messages/messages.service.ts`)

1. Same permission check as pinMessage.
2. Checks pin exists.
3. Deletes pin record.
4. Dispatches `dispatchPinEvent("unpin", ...)` → socket emit `MESSAGE_UNPIN` to conversation room.

### getPinnedMessages (`server/src/modules/messages/messages.repository.ts`)

- Fetches all pins for conversation where message is not soft-deleted.
- Includes message content, message author, pinnedBy user.
- Ordered by pin createdAt descending.

### Socket Events

- `MESSAGE_PIN`: `{ messageId, conversationId, action: "pin", pinnedBy, pinnedByUsername }`
- `MESSAGE_UNPIN`: `{ messageId, conversationId, action: "unpin", pinnedBy }`

---

## Frontend Implementation

### PinnedMessagesPanel (`client/src/modules/messages/components/PinnedMessagesPanel.tsx`)

- Fetches pins via `usePinnedMessages()` hook.
- Shows loading, error, and empty states.
- Sorted chronologically by original message creation time.
- Each pin shows: author avatar, username, message preview (Markdown rendered), pin timestamp, and unpin button.
- Clicking a pinned message scrolls to the original message (or sets `?highlight=` param if message not loaded).
- Mobile: closes right panel before scrolling.

### PinButton (`client/src/modules/messages/components/PinButton.tsx`)

- Button in message hover toolbar.
- Shows pin icon, toggles fill based on pinned state.
- Calls `usePinMessage` or `useUnpinMessage` mutation.
- Only visible when `canPin` prop is true.

### MessageGroupItem Integration

- Pin button in hover actions toolbar (desktop) and context menu (mobile + right-click).
- Pinned messages show a filled Pin icon next to the timestamp.
- `canPin` prop passed down from parent to control visibility.

### Socket Handlers

- `handlePinEvent` in `client/src/socket/handlers/message.handlers.ts` handles both pin and unpin events by invalidating the pins query cache.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| PinnedMessage table | ✅ | schema.prisma |
| Unique constraint per message | ✅ | `@@unique([messageId])` |
| Pin message endpoint | ✅ | `POST /conversations/:id/pins/:messageId` |
| Unpin message endpoint | ✅ | `DELETE /conversations/:id/pins/:messageId` |
| List pins endpoint | ✅ | `GET /conversations/:id/pins` |
| Permission (OWNER/ADMIN only) | ✅ | `findWorkspaceMember` role check |
| Socket event on pin | ✅ | `dispatchPinEvent("pin")` → MESSAGE_PIN |
| Socket event on unpin | ✅ | `dispatchPinEvent("unpin")` → MESSAGE_UNPIN |
| PinnedMessagesPanel UI | ✅ | Component with loading/empty/error states |
| Pin button in hover toolbar | ✅ | PinButton component |
| Scroll to pinned message | ✅ | scrollToMessage + highlight param |
| Pin survives message edit | ✅ | Pin linked to message ID, not content |
| Cascade delete on message delete | ✅ | onDelete: Cascade |
| Pin ordering | ✅ | Sorted chronologically |
| Pin limit per channel | ❌ | Unlimited pins allowed |
| Pin reordering | ❌ | No custom sort |
| Pin for DMs | ❌ | Workspace check fails for DMs |
| Pin notification | ❌ | No notification when message is pinned |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| ADMIN pins a message | Pin record created, socket broadcast | `pinMessage` creates PinnedMessage row, MESSAGE_PIN event | ✅ |
| MEMBER tries to pin a message | 403 forbidden | Workspace role check rejects | ✅ |
| Pin already-pinned message | 409 conflict | `findPinByMessageId` exists → `ConflictError` | ✅ |
| Unpin a message | Pin record deleted, socket broadcast | `deletePin` + MESSAGE_UNPIN event | ✅ |
| Unpin non-pinned message | 400 error | `findPinByMessageId` not found → `BadRequestError` | ✅ |
| View pinned messages | List with author, time, preview | `getPinnedMessages` with includes | ✅ |
| Click pinned message in panel | Scroll to original message | `scrollToMessage` + highlight URL param | ✅ |
| Delete message that was pinned | Pin record cascade deleted | Cascade delete on Message | ✅ |
| Edit pinned message | Pin still shows updated content | Pin linked to message ID | ✅ |
| Pin in DM conversation | 403 (cannot find workspace member) | No workspace member for DM → ForbiddenError | ✅ |

---

## Current Flow

```
Pin message:
  User clicks Pin button → POST /conversations/:id/pins/:messageId
  → authMiddleware → rejectDeletingAccount → validate → requireConversationMember
  → pinMessage:
    1. Find message → verify conversationId match
    2. If workspace conversation → check workspace OWNER/ADMIN
    3. Check not already pinned
    4. Create PinnedMessage row
    5. dispatchPinEvent("pin") → MESSAGE_PIN socket event
  → Return pin record

Unpin message:
  User clicks Unpin → DELETE /conversations/:id/pins/:messageId
  → Same middleware chain
  → unpinMessage:
    1. Workspace OWNER/ADMIN check
    2. Check pin exists
    3. Delete PinnedMessage row
    4. dispatchPinEvent("unpin") → MESSAGE_UNPIN socket event
  → Return { messageId, conversationId }
```

---

## Missing Pieces

```
□ Pin limit per channel (currently unlimited)
□ Pin reordering/custom sorting
□ Pin notifications
□ Pin for DMs (currently blocked by workspace check)
□ Pin activity log
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Pin message in deleted channel | Cascade delete removes pin | ✅ |
| Pin message from deleted user | `pinnedBy` remains valid (no cascade) | ✅ |
| Pin soft-deleted message | Allowed (not checked) | ⚠️ |
| Unpin and re-pin same message | Works (delete + create new pin) | ✅ |
| Pin 100+ messages in one channel | No limit, all displayed | ⚠️ |
| Pin message then edit it | Pin shows updated content | ✅ |

---

## Known Limitations

- No pin limit per channel — users could pin unlimited messages (potential spam).
- No custom pin ordering — always displayed in chronological order of message creation.
- Pins in DM conversations are blocked because the permission check requires a workspace membership.
- No notification is sent when a message is pinned — users must check the Pins panel.
- Pinning a soft-deleted message is not explicitly prevented.

---

## Files Inspected

```
server/src/modules/messages/messages.service.ts
server/src/modules/messages/messages.repository.ts
server/src/modules/messages/messages.controller.ts
server/src/modules/conversations/conversations.routes.ts
server/src/socket/socket.dispatcher.ts
server/prisma/schema.prisma
client/src/modules/messages/hooks/usePinnedMessages.ts
client/src/modules/messages/api/messages.api.ts
client/src/modules/messages/components/PinnedMessagesPanel.tsx
client/src/modules/messages/components/PinButton.tsx
client/src/modules/messages/components/MessageGroupItem.tsx
client/src/socket/handlers/message.handlers.ts
```
