# Messages Module

## Overview

The Messages module handles the lifecycle of individual chat messages — creating, reading, editing, and soft-deleting them. Messages are the core data unit of the Nexus platform.

## Server-Side (`server/src/modules/messages`)

### Endpoints

| Method | Route | Auth | Description | Socket Events Emitted |
|---|---|---|---|---|
| `GET` | `/conversations/:id/messages` | Yes | Cursor-based paginated history | None |
| `POST` | `/conversations/:id/messages` | Yes | Create and persist a new message | `message:new`, `conversation:update` |
| `PATCH` | `/conversations/:id/messages/:messageId` | Yes | Edit message content | `message:update`, `conversation:update` (if editing latest message) |
| `DELETE` | `/conversations/:id/messages/:messageId` | Yes | Soft-delete a message | `message:delete`, `conversation:update` (if deleting latest message) |

### Files

| File | Role |
|---|---|
| `messages.routes.ts` | Route definitions with Zod validation |
| `messages.controller.ts` | HTTP request handlers + socket event dispatch |
| `messages.service.ts` | Business logic (Prisma queries, transactions) |
| `messages.schema.ts` | Zod schemas for request validation |

### Business Logic

- **`createMessage`** — Uses a Prisma `$transaction` to atomically:
  1. Create the message record with UUIDv7 ID
  2. Update the conversation's `updatedAt` and `latestMessageId`
  3. Update the sender's `lastReadMessageId` on their `ConversationMember` row
  - Returns `{ message, conversationMetadata }` for socket dispatch

- **`editMessage`** — Validates:
  - Message exists (`getMessageById`)
  - Message is not soft-deleted (`deletedAt` is null)
  - Requesting user is the message owner
  - Content is non-empty after trimming
  - Sets `isEdited: true` on update
  - Returns `conversationMetadata` only if editing the latest message

- **`deleteMessage`** — Soft-deletes by setting `deletedAt` to current timestamp:
  - Validates same ownership checks as edit
  - ✅ **FIXED (2026-06-11)**: `nextLatestMessageId` is now computed **inside** `prisma.$transaction(async (tx) => { ... })` using `tx.message.findFirst` with `deletedAt: null` filter, eliminating the critical race condition.
  - Returns `conversationMetadata` only if deleting the latest message

- **`getMessages`** — Cursor-based pagination:
  - ✅ **FIXED (2026-06-11)**: Orders by `id: "desc"` (UUIDv7) for monotonic-safe cursor pagination
  - ✅ **FIXED (2026-06-11)**: Filters `deletedAt: null` — soft-deleted messages are no longer returned
  - Fetches one extra record to determine `hasNextPage`

### Socket Integration

The controller directly imports `dispatchMessageEvent` from `socket.dispatcher.ts` to broadcast socket events after successful database operations. This is called after the Prisma operation succeeds, meaning:

- ✅ Messages are always persisted before being broadcast
- ❌ The controller mixes HTTP and WebSocket concerns (known architectural debt)

## Client-Side

### API (`client/src/modules/messages/api/messages.api.ts`)

| Function | HTTP Method | Route |
|---|---|---|
| `getMessages(conversationId, cursor?)` | GET | `/conversations/{id}/messages?cursor=` |
| `createMessage(conversationId, content)` | POST | `/conversations/{id}/messages` |
| `editMessage(conversationId, messageId, content)` | PATCH | `/conversations/{id}/messages/{msgId}` |
| `deleteMessage(conversationId, messageId)` | DELETE | `/conversations/{id}/messages/{msgId}` |

### Hooks (`client/src/modules/messages/hooks/useMessages.ts`)

| Hook | Description |
|---|---|
| `useMessagesInfiniteQuery(conversationId)` | Infinite query for paginated message history |
| `useSendMessageMutation(conversationId, currentUser)` | Sends via Socket.io `message:send` with optimistic UI |
| `useEditMessageMutation(conversationId)` | Edits via REST PATCH with optimistic cache update |
| `useDeleteMessageMutation(conversationId)` | Deletes via REST DELETE with optimistic cache update |

### Optimistic Update Strategy

- **Send:** Message immediately appears with `pending: true` and a `tempId`. On server acknowledgment (`success: true`), the temp message is replaced with the real message.
- **Edit:** Instantly updates the cache via `updateMessageInCache()`, rolls back on error.
- **Delete:** Instantly marks message as deleted in cache via `markMessageDeletedInCache()`, rolls back on error.

### Known Technical Debt

See `.docs/TECHNICAL_DEBT.md` and `.docs/socket.md` for detailed documentation of:
- 🔴 **Non-transactional reads in `editMessage`** — `getMessageById` is called outside the `$transaction` (still unresolved)
- 🟡 Overloaded controllers mixing HTTP and socket concerns
