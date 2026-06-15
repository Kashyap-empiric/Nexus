# Server Conversations Module

**Location:** `server/src/modules/conversations/`

## Overview

The Conversations module manages direct messages (DMs) and serves as the foundation for channels. Conversations are the core organizational unit — messages belong to conversations, and users can be members of multiple conversations. The module also handles unread counting across both DMs and channels.

---

## Files & Functions

### `conversations.service.ts`
Business logic layer.

| Function | Signature | Purpose |
|---|---|---|
| `getConversationById` | `(conversationId) => Promise<ConversationDTO\|null>` | Fetches single conversation with members |
| `getUserConversations` | `(userId) => Promise<ConversationDTO[]>` | Gets all DMs for a user with unread counts |
| `getDMByUsers` | `(userIdA, userIdB) => Promise<Conversation\|null>` | Finds existing DM by dmPair |
| `createDM` | `(userIdA, userIdB) => Promise<Conversation>` | Creates new DM with both users |
| `createOrGetDM` | `(userIdA, userIdB) => Promise<{created, conversation}>` | Atomic create-or-find DM creation |
| `updateLastReadMessage` | `(conversationId, userId, messageId) => Promise<void>` | Updates lastReadMessageId |

### `conversations.repository.ts`
Data access layer.

| Function | Signature | Purpose |
|---|---|---|
| `findById` | `(id) => Conversation with members+users` | Full detail with member user profiles |
| `findDMsByUserId` | `(userId) => Conversation[]` | All DMs with latest message, ordered by `updatedAt` |
| `findDMByPair` | `(dmPair) => Conversation\|null` | Find DM by sorted user pair |
| `findChannelIdsByWorkspaceId` | `(workspaceId, userId?) => {id}[]` | Channel IDs filtered by user access |
| `findChannelIdsByWorkspaceIds` | `(workspaceIds, userId?) => {id}[]` | Bulk channel lookup across workspaces |
| `findChannelByWorkspaceId` | `(workspaceId, userId?) => Conversation[]` | Full channel list with members |
| `findConversationByIdForInvite` | `(id, userId) => Conversation\|null` | Membership check for invites |
| `countUnreadMessages` | `(conversationId, userId, lastReadMessageId?) => number` | Count unread since last read |
| `countUnreadByConversations` | `(userId, conversationIds) => Map` | Bulk unread counting via raw SQL |
| `createDM` | `(data) => Conversation` | Create DM in database |
| `updateLastReadMessage` | `(conversationId, userId, messageId) => ConversationMember` | Update lastReadMessageId |

### `conversations.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `getConversations` | `GET /api/conversations` | Returns all DM conversations with unread counts |
| `getConversationDetails` | `GET /api/conversations/:id` | Returns full detail with members |
| `createConversation` | `POST /api/conversations` | Creates or returns existing DM |
| `markConversationAsRead` | `PATCH /api/conversations/:id/read` | Marks as read, emits socket event |

### `conversations.routes.ts`
Route registration.

| Endpoint | Middleware | Handler |
|---|---|---|
| `GET /` | `authMiddleware` | `getConversations` |
| `POST /` | `authMiddleware, validate` | `createConversation` |
| `GET /:id` | `authMiddleware, requireConversationMember` | `getConversationDetails` |
| `PATCH /:id/read` | `authMiddleware, validate, requireConversationMember` | `markConversationAsRead` |

### `conversations.schema.ts`
Zod validation schemas.

| Schema | Fields | Purpose |
|---|---|---|
| `conversationParamsSchema` | `{ id: z.uuid() }` | Validates conversation ID param |
| `createConversationSchema` | `{ targetUserId: z.uuid() }` | Validates DM creation request |
| `markReadSchema` | `{ messageId: z.uuid() }` | Validates mark-as-read request |

---

## Architecture Decisions

1. **DM Pair Determinism**: DMs identified by sorted composite key (`dmPair`) of two user IDs.

2. **Optimized Unread Counting**: Uses `$queryRaw` SQL for bulk unread counting across multiple conversations/channels in a single query.

3. **uuidv7 for IDs**: Time-ordered UUIDs enable cursor-based pagination.

4. **Channel Access Control**: `findChannelIdsByWorkspaceId` accepts optional `userId` — if provided, filters private channels to those where user is a member. Prevents private channel room leaks.

5. **Bulk Channel Queries**: `findChannelIdsByWorkspaceIds` supports aggregate unread counting across multiple workspaces simultaneously.
