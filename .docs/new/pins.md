# Pin Messages — Feature Design

> **Status:** ❌ Not Started
> **Priority:** P1 (Low)
> **Effort:** 3-5 hours
> **Dependencies:** InfoPanel Pins tab (already built), Message model (exists)

---

## Overview

Pin Messages allows users to pin important messages within a conversation or channel. Pinned messages are displayed in the InfoPanel's "Pins" tab, providing a quick reference for important information. Any member can pin/unpin messages with appropriate permissions.

---

## A. Data Model

### New Model: `PinnedMessage`

```prisma
model PinnedMessage {
  id             String   @id @default(cuid())
  messageId      String
  conversationId String
  pinnedBy       String                       // User ID who pinned it
  createdAt      DateTime @default(now())

  message      Message      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  pinnedByUser User         @relation(fields: [pinnedBy], references: [id])

  @@unique([messageId])                      // A message can only be pinned once
  @@index([conversationId])                  // Fast query: "get all pins in this channel"
  @@index([pinnedBy])                        // Fast query: "get all pins by a user"
}
```

### Migration

1. Add `PinnedMessage` model to Prisma schema
2. Run: `npx prisma migrate dev --name add_pinned_messages`

---

## B. API Design

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/conversations/:convId/pins` | Yes (member) | Pin a message |
| `DELETE` | `/api/conversations/:convId/pins/:messageId` | Yes (pinner or admin) | Unpin a message |
| `GET` | `/api/conversations/:convId/pins` | Yes (member) | List pinned messages |

### Request/Response

**Pin a message:**
```
POST /api/conversations/:convId/pins
Body: { "messageId": "..." }
Response 201: {
  "data": {
    "id": "...",
    "messageId": "...",
    "conversationId": "...",
    "pinnedBy": "...",
    "pinnedByUser": { "id": "...", "username": "alex", "avatarUrl": null },
    "message": {
      "id": "...",
      "content": "Important message content",
      "user": { "id": "...", "username": "alex", "avatarUrl": null },
      "createdAt": "..."
    },
    "createdAt": "..."
  }
}
```

**Unpin a message:**
```
DELETE /api/conversations/:convId/pins/:messageId
Response 200: { "success": true }
```

**List pinned messages:**
```
GET /api/conversations/:convId/pins?cursor=...&limit=10
Response 200: {
  "data": [ /* PinnedMessage[] with message + user data */ ],
  "nextCursor": "..."
}
```

### Auth Rules

| Action | Permission |
|--------|-----------|
| **Pin a message** | Any conversation member |
| **Unpin own pin** | Original pinner |
| **Unpin anyone's pin** | Workspace OWNER or ADMIN (for channels), self for DMs |
| **View pins** | Any conversation member |

---

## C. Frontend Design

### New Components

#### `PinnedMessagesPanel.tsx`
**Location:** `client/src/modules/messages/components/PinnedMessagesPanel.tsx`

Displayed in the InfoPanel's "Pins" tab.

**States:**
| State | UI |
|-------|-----|
| Loading | Skeleton list (3 pin placeholders) |
| No pins | "No pinned messages yet" — subtle text with pin icon |
| Has pins | List of pinned messages |
| Error | Retry button + error message |
| Many pins | "Load more" pagination at bottom |

**Each pin item displays:**
- Pinned message content preview (truncated to 2 lines)
- Pinner: "Pinned by Alex" with avatar + username
- Timestamp: "2 hours ago"
- Actions: "Unpin" button (if authorized), "Jump to message" button
- Separator between pins

**Interactions:**
- Click "Jump to message" → navigate to conversation + scroll to pinned message
- Click "Unpin" → confirmation → remove pin
- Hover → background highlight

#### `PinButton.tsx`
**Location:** `client/src/modules/messages/components/PinButton.tsx`

A small pin icon button shown on message hover actions alongside edit/delete.

**States:**
| State | UI |
|-------|-----|
| Not pinned | Outline pin icon (Pin icon from lucide) |
| Pinned | Filled pin icon (PinOff icon from lucide) |
| Pinning/unpinning | Spinner or disabled state |

**Tooltip:**
- Not pinned: "Pin to channel"
- Pinned: "Unpin from channel" + shows who pinned it + when

### Updated Components

#### `InfoPanel.tsx`
The Pins tab is already built:
```tsx
{view === 'pins' && (
  <PinnedMessagesPanel conversationId={activeConversationId} />
)}
```
Currently shows "No pinned items yet" placeholder. Wire up to show actual data.

#### `MessageGroupItem.tsx`
- Add pin/unpin button in the hover action toolbar
- Show pin indicator (small pin icon) on messages that are pinned
- Position: top-right corner of message bubble or in hover actions

### State Management

#### Hooks (`usePinnedMessages.ts`)
**Location:** `client/src/modules/messages/hooks/usePinnedMessages.ts`

```typescript
export const usePinnedMessages = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ['pinned-messages', conversationId],
    queryFn: ({ pageParam }) => getPinnedMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });
};

export const usePinMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => pinMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', conversationId] });
    },
  });
};

export const useUnpinMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => unpinMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', conversationId] });
    },
  });
};
```

#### API Client (`messages.api.ts`)
```typescript
export const pinMessage = (conversationId: string, messageId: string) =>
  api.post(`/conversations/${conversationId}/pins`, { messageId });

export const unpinMessage = (conversationId: string, messageId: string) =>
  api.delete(`/conversations/${conversationId}/pins/${messageId}`);

export const getPinnedMessages = (conversationId: string, cursor?: string) =>
  api.get(`/conversations/${conversationId}/pins`, { params: { cursor } });
```

---

## D. Real-Time System

### Socket Events

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `message:pin` | S → C | `{ conversationId, messageId, pinnedBy, pinnedByUsername }` | Message pinned |
| `message:unpin` | S → C | `{ conversationId, messageId }` | Message unpinned |

### Dispatcher Extension

```typescript
export const dispatchPinEvent = (
  action: 'pin' | 'unpin',
  conversationId: string,
  payload: { messageId: string; pinnedBy?: string; pinnedByUsername?: string }
) => {
  const eventName = action === 'pin' ? SOCKET_EVENTS.MESSAGE_PIN : SOCKET_EVENTS.MESSAGE_UNPIN;
  getIO().to(`conversation:${conversationId}`).emit(eventName, payload);
};
```

### Client Handler

Real-time updates for pins:
- On `message:pin`: Update the pinned message indicator on the message + refresh pins panel
- On `message:unpin`: Remove pin indicator + refresh pins panel

---

## E. Edge Cases

| Scenario | Handling |
|----------|----------|
| **Pin deleted message** | Cascade deletes the pin. In pins list, show "This message has been deleted" placeholder. |
| **Pin already exists** | Return 409 Conflict. Client shows "This message is already pinned" toast. Or treat as idempotent (return existing pin). |
| **Unpin by non-author** | Workspace admins can unpin any message. Regular members can only unpin their own pins. |
| **50+ pinned messages** | Paginate pins list (10 per page, infinite scroll). |
| **Pin in DM** | Allowed — useful for bookmarking important messages. Only participants can pin/unpin. |
| **Pin in private channel** | Members can pin/unpin. Same permissions as public channels. |
| **User leaves conversation** | Pins remain visible to remaining members. Pinner name still shows as "pinned by {username}" (username may show "Deleted user" if account deleted). |
| **Message content edited** | Pin preview updates to show latest edited content. |
| **Concurrent pin/unpin** | Transactions prevent race conditions. First write wins. |

---

## F. Implementation Plan

### Phase 1: Backend (2 hours)

**Step 1: Migration**
- Add `PinnedMessage` model to Prisma schema
- Run migration

**Step 2: Service & Repository**
- Create `server/src/modules/messages/pins.service.ts`:
  - `pinMessage(conversationId, messageId, userId)` — validate message exists in conversation, create pin
  - `unpinMessage(conversationId, messageId, userId)` — validate permission, delete pin
  - `getPinnedMessages(conversationId, cursor?, limit?)` — paginated list with message + user data
- Extend `messages.repository.ts` with pin CRUD

**Step 3: Controller & Routes**
- Add `pinMessage`, `unpinMessage`, `getPinnedMessages` handlers to controller
- Add routes to `messages.routes.ts` or create `pins.routes.ts`

**Step 4: Socket Events**
- Add `MESSAGE_PIN`/`MESSAGE_UNPIN` to `SOCKET_EVENTS`
- Add `dispatchPinEvent` to `socket.dispatcher.ts`

### Phase 2: Frontend (1-2 hours)

**Step 5: API Client & Hooks**
- Add pin/unpin/getPinnedMessages to API client
- Create `usePinnedMessages.ts` hook with infinite query + mutations

**Step 6: Components**
- Create `PinnedMessagesPanel.tsx`
- Create `PinButton.tsx`
- Integrate into `InfoPanel.tsx` Pins tab
- Integrate into `MessageGroupItem.tsx` hover actions

**Step 7: Socket Handlers**
- Add handlePinMessage/handleUnpinMessage to socket handler
- Register in eventRouter

---

## G. Files Changed Summary

### Server

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add PinnedMessage model |
| `server/src/modules/messages/pins.service.ts` | **NEW** — pin/unpin/list |
| `server/src/modules/messages/messages.repository.ts` | Extend with pin CRUD |
| `server/src/modules/messages/messages.controller.ts` | Add pin handlers |
| `server/src/modules/messages/messages.routes.ts` | Add pin routes |
| `server/src/shared/socket-events.ts` | Add MESSAGE_PIN, MESSAGE_UNPIN |
| `server/src/socket/socket.dispatcher.ts` | Add dispatchPinEvent |

### Client

| File | Change |
|------|--------|
| `client/src/modules/messages/api/messages.api.ts` | Add pin/unpin/getPins |
| `client/src/modules/messages/hooks/usePinnedMessages.ts` | **NEW** — pin hooks |
| `client/src/modules/messages/components/PinnedMessagesPanel.tsx` | **NEW** — pins panel |
| `client/src/modules/messages/components/PinButton.tsx` | **NEW** — pin button |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Add pin button + indicator |
| `client/src/modules/chat/components/InfoPanel.tsx` | Wire up Pins tab |
| `client/src/socket/handlers/message.handlers.ts` | Add pin/unpin handlers |
| `client/src/socket/eventRouter.ts` | Register pin events |
| `client/src/socket/socket-events.ts` | Add pin event constants |
