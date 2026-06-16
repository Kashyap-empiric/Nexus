# Inline Replies — Implementation Docs

> **Status:** ✅ Implemented (June 16, 2026)
> **Covers:** Both DMs and Channels

## Overview

Users can now reply to a specific message in any conversation (DM or channel). Replies appear inline with a quote block showing the original message context, and a clickable banner navigates to the parent message.

## Feature Details

### Reply Action
- Hover over any message → Reply button (↩) appears in the actions bar
- Available on **all** messages, not just your own
- Desktop: icon button in hover actions row
- Mobile: Reply option in the context menu (right-click or long-press)
- Also accessible via the "More" dropdown for own messages

### Reply Banner (MessageInput)
- When replying, a dismissible banner appears above the input:
  > `↩ Replying to @username — [preview of original message]  [X]`
- Banner disappears on send or X click
- The `replyToId` is included in the socket send payload

### Reply Quote Block (MessageList)
- Messages that are replies render a small quote block above the content:
  > `╰── @username: Original message text...`
- Clicking the quote block scrolls smoothly to the parent message
- If the parent message is deleted, shows `[Message deleted]` instead

## Implementation

### Database (`server/prisma/schema.prisma`)

```prisma
model Message {
  // ... existing fields
  replyToId String?
  replyTo   Message?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies   Message[] @relation("MessageReplies")
}
```

- `onDelete: SetNull` — deleting a parent message nullifies `replyToId` on replies (no cascade delete)
- Schema synced via `npx prisma db push`

### Server Changes

**Types** (`server/src/modules/messages/messages.types.ts`):
- `MessageDTO` now includes `replyToId: string | null` and `replyTo: { id, content, deletedAt, user: { username } } | null`
- `CreateMessageInput` includes optional `replyToId?: string | null`

**Validation** (`server/src/modules/messages/messages.schema.ts`):
- `createMessageBodySchema` now accepts optional `replyToId: z.string().uuid()`

**Service** (`server/src/modules/messages/messages.service.ts`):
- `createMessage(conversationId, userId, content, replyToId?)` accepts optional `replyToId`
- Validates that the reply target message exists and belongs to the **same conversation** (prevents cross-conversation replies)

**Repository** (`server/src/modules/messages/messages.repository.ts`):
- `findMessages` — includes `replyTo` relation with `{ id, content, deletedAt, user: { username } }`
- `createMessageTransaction` — accepts `replyToId`, includes it in create data and includes `replyTo` in response
- `updateMessage` — includes `replyTo` in response
- `softDeleteMessageInTransaction` — includes `replyTo` in response

**Controller** (`server/src/modules/messages/messages.controller.ts`):
- `createMessage` handler extracts `replyToId` from request body and passes to service

**Socket Handler** (`server/src/socket/handlers/message.handler.ts`):
- Accepts `replyToId?: string` in socket `MESSAGE_SEND` payload
- Passes `payload.replyToId` to `createMessage`
- The response includes `replyTo` data in the broadcast

### Client Changes

**Types** (`client/src/modules/messages/types/message.ts`):
```ts
export interface ReplyTo {
  id: string;
  content: string;
  deletedAt: string | null;
  user: { username: string };
}

export interface Message {
  // ... existing fields
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
}
```

**Socket Types** (`client/src/modules/chat/types/socket.ts`):
- `MessageSendPayload` includes optional `replyToId?: string | null`

**API** (`client/src/modules/messages/api/messages.api.ts`):
- `createMessage(conversationId, content, replyToId?)` optionally accepts `replyToId`

**Hooks** (`client/src/modules/messages/hooks/useMessages.ts`):
- `useSendMessageMutation` passes `replyToId` in the socket emit payload

**Components:**

| Component | Changes |
|-----------|---------|
| `ActiveConversation` | Manages `replyingTo` state via `useState` + callbacks. Threads `onReply` to `MessageList` and `replyingTo`/`onClearReply` to `MessageInput`. |
| `MessageList` | Accepts `onReply` callback and passes to `MessageGroupItem`. |
| `MessageGroupItem` | Accepts `onReply` prop. Reply button in hover actions (all messages). Reply quote block rendered when `msg.replyTo` exists, with click-to-scroll. Message div gets `id={`msg-${msg.id}`}` for scroll targeting. Right-click triggers mobile dropdown on all messages, not just own. |
| `MessageInput` | Accepts `replyingTo` and `onClearReply` props. Renders dismissible reply banner. Includes `replyToId` on send. |

## Data Flow

1. User clicks Reply on a message → `handleReply(msgId, username, content)` sets `replyingTo` state
2. Reply banner appears above MessageInput with "Replying to @username — preview"
3. User types message and hits Enter → `sendMessage` is called with `replyToId: replyingTo.id`
4. Socket emits `message:send` with `{ conversationId, content, tempId, replyToId }`
5. Server validates: membership → same conversation check → creates message with `replyToId`
6. Server broadcasts `message:new` with full message including `replyTo` data
7. All clients receive the new message and render it inline with the reply quote block

## Edge Cases Handled

- **Deleted parent message**: `onDelete: SetNull` prevents cascade. `replyTo.deletedAt` check shows "[Message deleted]" in quote block
- **Cross-conversation replies**: Validated server-side — throws error if `replyToId` belongs to different conversation
- **Optimistic sending**: Reply state is cleared immediately on send for snappy UX
- **Your own messages**: Reply button still shown (you can reply to yourself, e.g., to add context)
- **Other users' messages**: Reply is always available. Edit/Delete restricted to own messages.

## Verification

- Server typecheck: ✅ No errors in messages module
- Client typecheck: ✅ No errors in messages/chat module
- Pre-existing errors in socket handlers (missing `fullName`) are from profile agent's changes, not replies
