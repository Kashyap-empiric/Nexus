# Conversations Module

## Overview

The Conversations module manages the logical containers for messages. Conversations can be either Direct Messages (`type: DM`) between two users or Channels (`type: CHANNEL`) within a workspace. The module handles creation, listing, metadata management, read receipts, and unread counting for both types.

## Server-Side (`server/src/modules/conversations`)

### Endpoints

| Method | Route | Auth | Description | Socket Events |
|--------|-------|------|-------------|---------------|
| `GET` | `/conversations` | Yes | List all DM conversations for the user | None |
| `GET` | `/conversations/:id` | Yes | Get single conversation with members | None |
| `POST` | `/conversations` | Yes | Create a new DM (or return existing) | `conversation:new`, dynamic room join |
| `PATCH` | `/conversations/:id/read` | Yes | Update `lastReadMessageId` | `message:read` |

### Files

| File | Role |
|------|------|
| `conversations.routes.ts` | Route definitions |
| `conversations.controller.ts` | HTTP request handlers + socket dispatch |
| `conversations.service.ts` | Business logic (dmPair, read receipts, unread counting) |
| `conversations.schema.ts` | Zod validation schemas |
| `conversations.repository.ts` | Prisma queries |
| `conversations.types.ts` | TypeScript interfaces |

### Key Logic

- **dmPair Strategy:** Prevents duplicate DMs using a sorted, concatenated pair of user IDs (`userA_userB`) as a unique constraint.
- **`createOrGetDM`:** Tries to create a DM, catches `P2002` (duplicate) and returns existing.
- **Read Receipts:** Updates `ConversationMember.lastReadMessageId` via upsert, broadcasts `message:read` via socket.
- **Unread Counting:** For DMs and channels, counts messages newer than the user's `lastReadMessageId` from other users. Uses raw SQL `$queryRaw` for efficient bulk counting via `countUnreadByConversations()`.
- **Channel access check:** Uses `checkConversationAccess()` which allows workspace members to access non-private channels without explicit membership records.
- **Private channel filtering:** `findChannelIdsByWorkspaceId` and `findChannelByWorkspaceId` accept an optional `userId` parameter to filter private channels by explicit membership, preventing socket room leaks.
- **Bulk channel queries:** `findChannelIdsByWorkspaceIds` supports multiple workspace IDs for aggregate unread counting.

## Client-Side (`client/src/modules/conversations`)

### Components

| Component | Role |
|-----------|------|
| `Sidebar.tsx` | Conversation/channel list with search, mode switching (DM vs workspace), public/private channel separation |
| `NewConversationModal.tsx` | User search + DM creation |
| `EmptyState.tsx` | Shown when no conversation is selected |
| `EmptyStateSkeleton.tsx` | Loading skeleton |

### API & Hooks

| File | Role |
|------|------|
| `api/conversations.api.ts` | REST API calls (list, details, create, mark read) |
| `hooks/useConversations.ts` | TanStack Query hooks (list, details, create, mark read) |
| `types/conversation.ts` | TypeScript interfaces (Conversation, ConversationMember, User) |

### Socket Handling

- **`conversation:new`** — Prepends new conversation to sidebar cache via `eventRouter`
- **`conversation:update`** — Updates conversation metadata (latestMessage, updatedAt) and re-sorts sidebar
- **`message:read`** — Updates `lastReadMessageId` on the relevant member in cache

### Known Issues

- Read receipts (`partnerLastReadMessageId`) only work for DMs, not channels
- Channel unread counts are computed but channel-level read receipts are not synchronized
