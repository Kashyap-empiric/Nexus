# Conversations Module

## Overview

The Conversations module manages the logical containers for messages. Conversations can be Direct Messages (DM) between two users or Channels (planned for Phase 2). The module handles creation, listing, metadata management, and read receipts.

## Server-Side (`server/src/modules/conversations`)

### Endpoints

| Method | Route | Auth | Description | Socket Events Emitted |
|---|---|---|---|---|
| `GET` | `/conversations` | Yes | List all conversations for the current user | None |
| `GET` | `/conversations/:id` | Yes | Get single conversation with members | None |
| `POST` | `/conversations` | Yes | Create a new DM (or return existing one) | `conversation:new`, dynamic room join |
| `PATCH` | `/conversations/:id/read` | Yes | Update `lastReadMessageId` for the current user | `message:read` |

### Files

| File | Role |
|---|---|
| `conversations.routes.ts` | Route definitions |
| `conversations.controller.ts` | HTTP request handlers + socket event dispatch |
| `conversations.service.ts` | Business logic (DM creation with dmPair, read receipt updates) |
| `conversations.schema.ts` | Zod validation schemas |

### Key Logic

- **dmPair Strategy:** Prevents duplicate DMs by using a sorted, concatenated pair of user IDs (`userA_userB`) as a unique constraint on the `Conversation` table
- **`createOrGetDM`:** Attempts to create a conversation with a unique `dmPair`. If a `P2002` unique constraint violation occurs (race condition or duplicate), falls back to returning the existing conversation
- **Read Receipts:** Updates `ConversationMember.lastReadMessageId` via `updateLastReadMessage`, then broadcasts `message:read` to the conversation room

### Socket Integration

- **`POST /conversations`:** If a new conversation is created, calls `dispatchConversationNew(conversation)` which:
  1. Iterates all connected sockets and calls `socket.join("conversation:{id}")` for each participant
  2. Emits `conversation:new` to each participant's `user:<userId>` room
- **`PATCH /conversations/:id/read`:** After updating the DB, calls `dispatchMessageRead()` to emit `message:read` to the conversation room

## Client-Side

### API (`client/src/modules/chat/api/conversations.api.ts`)

| Function | HTTP Method |
|---|---|
| `getConversations()` | GET |
| `getConversationDetails(id)` | GET |
| `createConversation(targetUserId)` | POST |
| `markConversationRead(conversationId, messageId)` | PATCH |

### Hooks (`client/src/modules/chat/hooks/useConversations.ts`)

| Hook | Description |
|---|---|
| `useConversationsQuery()` | Fetches conversation list with TanStack Query |
| `useConversationDetailsQuery(id)` | Fetches single conversation details |
| `useCreateConversationMutation()` | Creates DM with optimistic sidebar update |
| `useMarkConversationReadMutation()` | Marks conversation as read via REST |

### Client-Side Socket Handling

- **`conversation:new`** — Handled by `useGlobalSocket` → `conversation.handlers.ts` → `handleConversationNew()` — prepends new conversation to sidebar cache, avoiding duplicates
- **`conversation:update`** — Handled by `handleConversationUpdate()` — updates conversation metadata (latestMessage, updatedAt) and re-sorts the sidebar array

### Recent Updates

- feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
