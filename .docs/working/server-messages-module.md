# Server Messages Module

**Location:** `server/src/modules/messages/`

## Overview

The Messages module handles the complete lifecycle of messages — creation, reading (with cursor-based pagination), editing, and soft deletion. Messages are always associated with a conversation (DM or channel). The module uses UUIDv7 IDs for time-ordered cursor pagination and employs Prisma transactions for atomic operations.

---

## Files & Functions

### `messages.service.ts`
Business logic layer.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `getMessages` | `(conversationId, cursor?, limit=50) => Promise<{messages, nextCursor}>` | Fetches paginated messages, ordered newest-first | Cursor-based pagination — fetches limit+1 to determine if more exist, then pops the extra |
| `createMessage` | `(conversationId, userId, content) => Promise<{message, conversationMetadata}>` | Creates a new message atomically with conversation update | Uses Prisma transaction to create message + update conversation + update member's lastReadMessageId in one atomic operation |
| `getMessageById` | `(messageId) => Promise<Message\|null>` | Fetches a single message with conversation metadata | Used by edit/delete validation and by conversations controller for read-marking |
| `editMessage` | `(messageId, userId, content) => Promise<{message, conversationMetadata}>` | Edits a message, setting `isEdited: true` | Validates ownership, checks message not deleted, updates content, returns conversation metadata if it's the latest message |
| `deleteMessage` | `(messageId, userId) => Promise<{message, conversationMetadata}>` | Soft-deletes a message by setting `deletedAt` | Validates ownership, uses transaction to update latest message pointer if this was the latest message |

### `messages.repository.ts`
Data access layer with transaction helpers.

| Function | Signature | Purpose |
|---|---|---|
| `findMessages` | `(conversationId, cursor?, limit) => Message[]` | Cursor-based message fetch, excluding soft-deleted, with user include |
| `findById` | `(messageId) => Message + conversation` | Single message lookup with conversation metadata |
| `createMessageTransaction` | `(conversationId, userId, content, messageId) => [Message, Conversation, Member]` | Atomic transaction: creates message, updates conversation `updatedAt` + `latestMessageId`, updates sender's `lastReadMessageId` |
| `updateMessage` | `(messageId, content) => Message` | Updates message content and sets `isEdited: true` |
| `findNextLatestMessageInTransaction` | `(tx, conversationId, excludedId) => Message\|null` | Finds the next message to become "latest" after deletion of current latest |
| `softDeleteMessageInTransaction` | `(tx, messageId) => Message` | Sets `deletedAt` on a message within a transaction |
| `updateConversationLatestMessageInTransaction` | `(tx, conversationId, latestMessageId) => Conversation` | Updates conversation's latest message pointer after deletion |

### `messages.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `getMessages` | `GET /api/conversations/:conversationId/messages` | Returns paginated messages with cursor |
| `createMessage` | `POST /api/conversations/:conversationId/messages` | Creates and dispatches message via socket event |
| `updateMessage` | `PATCH /api/conversations/:conversationId/messages/:messageId` | Updates message content, dispatches socket event |
| `deleteMessage` | `DELETE /api/conversations/:conversationId/messages/:messageId` | Soft-deletes message, dispatches socket event |

### `messages.routes.ts`
Route registration (mounted as nested routes under conversations).

| Endpoint | Middleware | Handler |
|---|---|---|
| `GET /` | `authMiddleware, validate, requireConversationMember` | `getMessages` |
| `POST /` | `messageLimiter, authMiddleware, validate, requireConversationMember` | `createMessage` |
| `PATCH /:messageId` | `messageLimiter, authMiddleware, validate, requireConversationMember` | `updateMessage` |
| `DELETE /:messageId` | `messageLimiter, authMiddleware, validate, requireConversationMember` | `deleteMessage` |

### `messages.schema.ts`
Zod validation schemas.

| Schema | Fields | Purpose |
|---|---|---|
| `getMessagesQuerySchema` | `cursor?: uuid, limit?: number (1-100, default 50)` | Validates pagination params |
| `messageParamsSchema` | `conversationId: uuid` | Validates conversation ID param |
| `messageIdParamsSchema` | `conversationId, messageId: uuid` | Validates both params for edit/delete |
| `createMessageBodySchema` | `content: string (1-2000 chars)` | Validates message content |
| `updateMessageBodySchema` | `content: string (1-2000 chars)` | Validates edit content |

### `messages.types.ts`
TypeScript types for message DTOs and service I/O.

| Type | Purpose |
|---|---|
| `MessageDTO` | Full message data with user info |
| `MessagePage` | Paginated message response |
| `ConversationMetadataDTO` | Conversation update payload for socket dispatch |
| `CreateMessageResult` | Service return type with message + metadata |
| `EditMessageResult` | Service return type for edits |
| `DeleteMessageResult` | Service return type for deletions |

---

## Architecture Decisions

1. **Soft Deletion**: Messages are soft-deleted (`deletedAt` set to current date) rather than hard-deleted. This preserves conversation integrity — other members can still see "This message was deleted" placeholders. The `findMessages` query filters out deleted messages (`deletedAt: null`), but the API returns the deleted message object with the `deletedAt` field set.

2. **Cursor-based Pagination**: Uses UUIDv7 IDs as cursors. Since UUIDv7 encodes the current timestamp in the ID, ordering by `id` is equivalent to ordering by `createdAt`. This enables efficient pagination without OFFSET.

3. **Atomic Message Creation**: The `createMessageTransaction` function runs three Prisma operations in a single `$transaction`: create message → update conversation `updatedAt` + `latestMessageId` → update sender's `lastReadMessageId`. This prevents race conditions where a conversation's latest message pointer could be out of sync.

4. **Latest Message Pointer Update on Delete**: When deleting the latest message in a conversation, the system finds the next most recent non-deleted message and updates the conversation's `latestMessageId`. This ensures the sidebar shows the correct last message after deletion.

5. **Rate Limiting**: The `messageLimiter` middleware is applied to POST, PATCH, and DELETE endpoints to prevent spam. It's separate from the `generalLimiter` to allow different thresholds for message operations.

6. **Socket Dispatch from HTTP**: Message mutations (create/edit/delete) dispatch socket events via `dispatchMessageEvent()`. This ensures all clients in the conversation room receive real-time updates even when mutations happen through HTTP endpoints.
