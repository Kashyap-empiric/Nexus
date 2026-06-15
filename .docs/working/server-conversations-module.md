# Server Conversations Module

**Location:** `server/src/modules/conversations/`

## Overview

The Conversations module manages direct messages (DMs) and serves as the foundation for channels. Conversations are the core organizational unit in Nexus — messages belong to conversations, and users can be members of multiple conversations. The module creates, retrieves, and manages conversation metadata and membership, including unread tracking.

---

## Files & Functions

### `conversations.service.ts`
Business logic layer for conversation operations.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `getConversationById` | `(conversationId: string) => Promise<ConversationDTO\|null>` | Fetches a single conversation with members | Used by the HTTP controller for detail view |
| `getUserConversations` | `(userId: string) => Promise<ConversationDTO[]>` | Gets all DM conversations for a user with unread counts | Powers the sidebar. Efficiently computes unread counts only for candidate conversations |
| `getDMByUsers` | `(userIdA, userIdB) => Promise<Conversation\|null>` | Finds an existing DM between two users by their dmPair | Used before creating a DM to avoid duplicates |
| `createDM` | `(userIdA, userIdB) => Promise<Conversation>` | Creates a new DM with both users as members | Generates UUIDv7, builds deterministic dmPair, creates via repository |
| `createOrGetDM` | `(userIdA, userIdB) => Promise<{created, conversation}>` | Atomically tries to create a DM, falling back to existing | Race-condition-safe DM creation — handles P2002 unique constraint errors |
| `updateLastReadMessage` | `(conversationId, userId, messageId) => Promise<void>` | Updates the `lastReadMessageId` for a member | Used when marking a conversation as read |

### `conversations.repository.ts`
Data access layer.

| Function | Signature | Purpose |
|---|---|---|
| `findById` | `(id) => Conversation with members+users` | Full conversation detail with member user profiles |
| `findDMsByUserId` | `(userId) => Conversation[]` | All DMs for a user, includes latest message, ordered by `updatedAt` desc |
| `findDMByPair` | `(dmPair) => Conversation\|null` | Find a DM by the sorted user pair string |
| `findChannelIdsByWorkspaceId` | `(workspaceId, userId?) => {id}[]` | Channel IDs for a workspace, filtered by user access (public vs private) |
| `findChannelByWorkspaceId` | `(workspaceId) => Conversation[]` | Full channel list for a workspace with members and latest messages |
| `findConversationByIdForInvite` | `(id, userId) => Conversation\|null` | Checks if user is a member of a conversation |
| `countUnreadMessages` | `(conversationId, userId, lastReadMessageId?) => number` | Counts unread messages since last read |
| `createDM` | `(data) => Conversation` | Creates a DM conversation in the database |
| `updateLastReadMessage` | `(conversationId, userId, messageId) => ConversationMember` | Updates the lastReadMessageId for a member |

### `conversations.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `getConversations` | `GET /api/conversations` | Returns all DM conversations for the authenticated user with unread counts |
| `getConversationDetails` | `GET /api/conversations/:id` | Returns full conversation details with members |
| `createConversation` | `POST /api/conversations` | Creates or returns an existing DM with another user. Dispatches socket event if new |
| `markConversationAsRead` | `PATCH /api/conversations/:id/read` | Marks a conversation as read by updating `lastReadMessageId`. Emits socket read event |

### `conversations.routes.ts`
Route registration.

| Endpoint | Middleware | Handler |
|---|---|---|
| `GET /` | `authMiddleware` | `getConversations` |
| `POST /` | `authMiddleware, validate` | `createConversation` |
| `GET /:id` | `authMiddleware, requireConversationMember` | `getConversationDetails` |
| `PATCH /:id/read` | `authMiddleware, validate, requireConversationMember` | `markConversationAsRead` |

**Nested routes:**
- `/:conversationId/messages` → mounted `messagesRoutes` (via `mergeParams: true`)

### `conversations.schema.ts`
Zod validation schemas.

| Schema | Fields | Purpose |
|---|---|---|
| `conversationParamsSchema` | `{ id: z.uuid() }` | Validates the conversation ID parameter |
| `createConversationSchema` | `{ targetUserId: z.uuid() }` | Validates DM creation request body |
| `markReadSchema` | `{ messageId: z.uuid() }` | Validates mark-as-read request body |

### `conversations.types.ts`
TypeScript types defining the data structures used across the module.

| Type | Purpose |
|---|---|
| `DMPair` | String type: `${sorted(userA)}:${sorted(userB)}` |
| `ConversationDTO` | Full conversation data with members, latest message, and unread count |
| `ConversationMemberDTO` | Member data with user profile and lastReadMessageId |
| `LatestMessageDTO` | Latest message preview for sidebar |
| `ChannelDTO` | Channel data with workspace association |

---

## Architecture Decisions

1. **DM Pair Determinism**: DMs are identified by a sorted composite key (`dmPair`) of the two user IDs (`userA:userB` where A < B). This ensures exactly one DM exists per pair of users, preventing duplicate conversations.

2. **Optimized Unread Counting**: Unread counts are computed only for conversations that have a `latestMessageId` different from the user's `lastReadMessageId` AND where the latest message was sent by someone else. This avoids unnecessary COUNT queries on read conversations.

3. **uuidv7 for IDs**: All conversation IDs use UUIDv7 (time-ordered UUIDs). This enables cursor-based pagination (messages are ordered by ID, which is time-sorted) and prevents ID collisions.

4. **Schema Invariant — DMs have null workspaceId**: DMs always have `workspaceId: null`, while channels always have a valid `workspaceId`. This invariant is enforced in the service layer and enables simple filtering between DM and channel conversations.

5. **Nested Messages Routes**: Messages routes are mounted under `/:conversationId/messages` with `mergeParams: true`, allowing the messages controller to access the parent conversation ID from URL params.
