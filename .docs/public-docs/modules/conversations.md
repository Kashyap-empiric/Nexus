# Conversations Module

## Overview

The Conversations module manages the logical containers for messages. Conversations can be either Direct Messages (`type: DM`) between two users or Channels (`type: CHANNEL`) within a workspace. The module handles creation, listing, metadata management, and read receipts for both types.

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
- **Unread Counting:** For DMs, counts messages newer than the user's `lastReadMessageId` from other users. Unread count is included in the conversation list response.
- **Channel access check:** Uses `checkConversationAccess()` which allows workspace members to access non-private channels without explicit membership records.

## Client-Side (`client/src/modules/conversations`)

### Components

| Component | Role |
|-----------|------|
| `Sidebar.tsx` | Conversation/channel list with search, mode switching (DM vs workspace) |
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
- Channel unread counts are not computed (only DM conversations get unread counts)
