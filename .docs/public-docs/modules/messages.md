# Messages Module

## Overview

The Messages module handles the lifecycle of individual chat messages — creating, reading, editing, soft-deleting, and rendering them with markdown formatting. Messages are the core data unit of the Nexus platform.

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
| `messages.types.ts` | TypeScript interfaces (MessageDTO, MessagePage, etc.) |

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
  - ✅ **FIXED**: `nextLatestMessageId` computed **inside** `prisma.$transaction` using `tx.message.findFirst` with `deletedAt: null` filter
  - Returns `conversationMetadata` only if deleting the latest message

- **`getMessages`** — Cursor-based pagination:
  - ✅ Orders by `id: \"desc\"` (UUIDv7) for monotonic-safe cursor pagination
  - ✅ Filters `deletedAt: null` — soft-deleted messages not returned
  - Fetches one extra record to determine `hasNextPage`

### Socket Integration

The controller directly imports `dispatchMessageEvent` from `socket.dispatcher.ts` to broadcast socket events after successful database operations.

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

### Components

| Component | Role |
|-----------|------|
| `MessageList.tsx` | Paginated message list with infinite scroll |
| `MessageGroupItem.tsx` | Grouped message renderer with hover actions |
| `MessageInput.tsx` | Compose + send messages with emoji picker |
| `MessageStatus.tsx` | Pending/sent/read indicator |
| `MarkdownRenderer.tsx` | Renders message content with react-markdown + remark-gfm |
| `MessageListSkeleton.tsx` | Loading skeleton |

### Optimistic Update Strategy

- **Send:** Message immediately appears with `pending: true` and a `tempId`. On server acknowledgment, the temp message is replaced with the real message.
- **Edit:** Instantly updates the cache via `updateMessageInCache()`, rolls back on error.
- **Delete:** Instantly marks message as deleted in cache via `markMessageDeletedInCache()`, rolls back on error.

### Markdown Rendering

Messages are stored as plain text and rendered client-side using `react-markdown` + `remark-gfm`:

| Syntax | Rendered As |
|---|---|
| `**bold**` or `__bold__` | `<strong>` |
| `*italic*` or `_italic_` | `<em>` |
| `~~strikethrough~~` | `<del>` |
| `` `code` `` | `<code>` |
| ` ``` ``` ` (code blocks) | `<pre><code>` with copy button |
| `> quote` | `<blockquote>` with left accent border |
| `- list` / `1. list` | `<ul>` / `<ol>` |
| `[text](url)` | `<a>` target="_blank" |

### Known Technical Debt

- 🔴 **Non-transactional reads in `editMessage`** — `getMessageById` is called outside the `$transaction`
- 🟡 Overloaded controllers mixing HTTP and socket concerns
