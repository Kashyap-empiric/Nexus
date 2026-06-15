# Reactions — Feature Design

> **Status:** ❌ Not Started
> **Priority:** P0 (Medium)
> **Effort:** 4-6 hours
> **Dependencies:** DB migration, emoji picker (exists: `emoji-picker-react` v4.19.1)

---

## Overview

Reactions allow users to add emoji reactions to messages. Users can add or remove emoji reactions on any message they can see using toggle semantics (same emoji again removes it). Reactions appear inline below each message as a horizontal bar of emoji buttons with counts.

---

## A. Data Model

### New Model: `Reaction`

```prisma
model Reaction {
  id        String   @id @default(cuid())
  emoji     String                            // Unicode emoji character(s)
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])  // One reaction per emoji per user per message
  @@index([messageId])                  // Fast "get all reactions for message"
  @@index([userId])                     // Fast "get all reactions by user"
}
```

### Extension to `Message` Model

```prisma
model Message {
  // ... existing fields
  reactions       Reaction[]         // Relation
  reactionCount   Int   @default(0)  // Denormalized count cache
}
```

### Migration Steps

1. Add `Reaction` model to `server/prisma/schema.prisma`
2. Add `reactions Reaction[]` and `reactionCount Int @default(0)` to `Message`
3. Run: `npx prisma migrate dev --name add_reactions`

---

## B. API Design

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/conversations/:convId/messages/:msgId/reactions` | Yes (member) | Toggle reaction (add/remove) |
| `GET` | `/api/conversations/:convId/messages/:msgId/reactions` | Yes (member) | Get aggregated reactions |

### Request/Response

**Toggle a reaction:**
```
POST /api/conversations/:convId/messages/:msgId/reactions
Body: { "emoji": "👍" }
Response 200: {
  "action": "added" | "removed",
  "reaction"?: { "id": "...", "emoji": "👍", "userId": "...", "messageId": "...", "createdAt": "..." }
}
```

**Get reactions (aggregated):**
```
GET /api/conversations/:convId/messages/:msgId/reactions
Response 200: {
  "data": {
    "👍": { "count": 3, "users": [{ "id": "...", "username": "alex", "avatarUrl": null }], "hasReacted": true },
    "🚀": { "count": 1, "users": [{ "id": "...", "username": "robin" }], "hasReacted": false }
  }
}
```

### Updated Existing Endpoint

The existing `GET /api/conversations/:id/messages` response should include `reactions` on each message:
```json
{
  "data": [{
    "id": "...",
    "content": "Hello!",
    "reactions": [
      { "id": "...", "emoji": "👍", "userId": "...", "user": { "username": "alex" } }
    ],
    "reactionCount": 1,
    ...
  }]
}
```

### Auth Rules

- Must be a member of the conversation (`requireConversationMember` middleware)
- No admin approval needed — any member can react to any message
- Reacting to own message is allowed (same as Slack/Discord)

---

## C. Frontend Design

### New Components

#### `ReactionBar.tsx`
**Location:** `client/src/modules/messages/components/ReactionBar.tsx`

A horizontal row of emoji buttons below each message:

```
[👍 3] [🚀 1] [❤️ 5] [+]
```

**States:**
| State | UI |
|-------|-----|
| No reactions | Only the "+" add button visible |
| Has reactions | Emoji + count pills. User's reactions highlighted |
| Loading | Skeleton pills |
| Error | Hide (graceful degradation) |
| Toggle pending | Disable interaction, no visual change |

**Interactions:**
- Click reaction pill → toggle on/off (optimistic)
- Hover reaction → tooltip "Alice, Bob, Charlie" (who reacted)
- Click "+" → `EmojiPicker` popover opens
- Select emoji → adds reaction, popover closes

**Design:**
- Each pill: rounded, `text-sm`, emoji character + count
- User's reactions: filled background (`bg-primary/10`), others: `bg-muted`
- Compact layout, wraps to next line if many reactions
- Touch-friendly 44px tap targets on mobile

#### `EmojiPicker.tsx` (reuse existing)
Already exists in `MessageInput.tsx`. Reuse the same `emoji-picker-react` integration:
- Dark/light theme support
- Categories navigation
- Search within emojis

### Updated Components

#### `MessageGroupItem.tsx`
Add `<ReactionBar>` below message content (between content and status indicators):
```tsx
{message.reactions && message.reactions.length > 0 && (
  <ReactionBar
    messageId={message.id}
    reactions={message.reactions}
    onToggle={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji })}
  />
)}
```

### State Management

#### Hooks (`useMessages.ts`)
```typescript
// Add to existing mutations
useToggleReaction: (messageId: string) => UseMutationResult

// Optimistic update pattern:
onMutate: async ({ messageId, emoji }) => {
  // Snapshot current reactions
  // Optimistically add/remove emoji from cache
  cancelQueries(['messages', conversationId])
  setQueryData(...)
  return { previousReactions }
}
onError: (err, vars, context) => {
  // Rollback to snapshot
  setQueryData(..., context.previousReactions)
}
onSettled: () => {
  invalidateQueries(['messages', conversationId])
}
```

#### API Client (`messages.api.ts`)
```typescript
export const toggleReaction = (conversationId: string, messageId: string, emoji: string) =>
  api.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
```

---

## D. Real-Time System

### New Socket Events

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `reaction:added` | S → C | `{ messageId, emoji, userId, username, count }` | User adds reaction |
| `reaction:removed` | S → C | `{ messageId, emoji, userId, count }` | User removes reaction |

### Socket Dispatcher Extension

```typescript
// In socket.dispatcher.ts
export const dispatchReactionEvent = (
  action: 'added' | 'removed',
  conversationId: string,
  payload: { messageId: string; emoji: string; userId: string; username?: string; count: number }
) => {
  const eventName = action === 'added' ? SOCKET_EVENTS.REACTION_ADDED : SOCKET_EVENTS.REACTION_REMOVED;
  getIO().to(`conversation:${conversationId}`).emit(eventName, payload);
};
```

### Constants

```typescript
// In shared/socket-events.ts (server + client)
export const SOCKET_EVENTS = {
  // ... existing
  REACTION_ADDED: "reaction:added",
  REACTION_REMOVED: "reaction:removed",
} as const;
```

### Client Handler

```typescript
// In reaction.handlers.ts
export const handleReactionAdded = (data) => {
  queryClient.setQueryData(['messages', conversationId], (old) => {
    // Find the message and update its reactions array
  });
};

export const handleReactionRemoved = (data) => {
  // Similar logic, remove emoji from message's reactions
};
```

### Sync Behavior

- Reactions are delivered as part of the `GET /messages` response (included in Prisma query)
- Socket events provide real-time updates for currently viewed conversations
- No separate reaction fetch needed — always included with messages

---

## E. Edge Cases

| Scenario | Handling |
|----------|----------|
| **User reacts to deleted message** | Allowed — cascade delete on message removal handles cleanup |
| **Concurrent toggle by same user** | `@@unique` prevents duplicate; second attempt = delete (toggle off) |
| **User leaves conversation** | Cascade delete removes all their reactions (via Message → Reaction cascade or direct userId) |
| **100+ reactions on one message** | UI wraps to next line; emoji picker scrolls naturally |
| **Invalid emoji** | Trust client — `emoji-picker-react` constrains to valid emojis. Store raw Unicode character. |
| **Own message reactions** | Allowed — self-reactions are valid in Slack/Discord |
| **User sends emoji that doesn't render** | Store raw emoji char. If browser can't render it, it's a browser issue. |
| **Reaction count off by one** | Denormalized `reactionCount` could drift. Include a background reconciliation job in future. |
| **Offline reaction** | Queue reaction toggle, dispatch on reconnect |
| **Multiple devices/browsers** | Each device receives socket events; reaction state stays in sync via server authority |

---

## F. Implementation Plan

### Phase 1: Backend (2-3 hours)

**Step 1: Database Migration**
- Add `Reaction` model to Prisma schema
- Add `reactions Reaction[]` and `reactionCount Int @default(0)` to `Message`
- Create and run migration

**Step 2: Repository & Service**
- Create `server/src/modules/messages/reactions.service.ts`:
  - `toggleReaction(messageId, userId, emoji)` — lookup → delete or create
  - `getReactions(messageId, userId)` — aggregated with `hasReacted` flag
- Extend `server/src/modules/messages/messages.repository.ts`:
  - `findReaction(messageId, userId, emoji)` — lookup
  - `createReaction(messageId, userId, emoji)` — insert
  - `deleteReaction(reactionId)` — delete
  - `incrementReactionCount(messageId)` / `decrementReactionCount(messageId)`
  - `findReactionsByMessageId(messageId)` — get all for message
- Extend `messages.service.ts` `getMessages` to include `reactions` in Prisma query

**Step 3: Schema & Types**
- Create `reactions.schema.ts`: `toggleReactionBodySchema` with emoji validation
- Create `reactions.types.ts`: `ReactionDTO`, `AggregatedReactions`, `ToggleReactionResult`

**Step 4: Controller & Routes**
- Add `toggleReaction` and `getReactions` to `messages.controller.ts`
- Add routes to `messages.routes.ts`: POST and GET `/:messageId/reactions`

**Step 5: Socket Events**
- Add `REACTION_ADDED`/`REACTION_REMOVED` to `SOCKET_EVENTS`
- Add `dispatchReactionEvent` to `socket.dispatcher.ts`
- In controller after toggle: emit to conversation room

### Phase 2: Frontend (2-3 hours)

**Step 6: API Client**
- Add `toggleReaction(conversationId, messageId, emoji)` to `messages.api.ts`
- Add `getReactions(conversationId, messageId)` to `messages.api.ts`

**Step 7: Hooks**
- Add `useToggleReaction` mutation to `useMessages.ts` with optimistic updates
- Add `useReactions` query to `useMessages.ts`

**Step 8: Components**
- Create `ReactionBar.tsx` component
- Create `EmojiPickerPopover.tsx` (or reuse existing from MessageInput)
- Integrate `ReactionBar` into `MessageGroupItem.tsx`

**Step 9: Socket Handlers**
- Create `reaction.handlers.ts` with `handleReactionAdded` + `handleReactionRemoved`
- Register in `eventRouter.ts` and `useConversationSocket.ts`

---

## G. Files Changed Summary

### Server

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Reaction model + Message.reactions relation |
| `server/src/modules/messages/reactions.service.ts` | **NEW** — toggle, get reactions |
| `server/src/modules/messages/reactions.schema.ts` | **NEW** — emoji validation |
| `server/src/modules/messages/reactions.types.ts` | **NEW** — type definitions |
| `server/src/modules/messages/messages.repository.ts` | Extend: reaction CRUD + count cache |
| `server/src/modules/messages/messages.service.ts` | Extend: include reactions in getMessages |
| `server/src/modules/messages/messages.controller.ts` | Add toggleReaction, getReactions handlers |
| `server/src/modules/messages/messages.routes.ts` | Add reaction routes |
| `server/src/shared/socket-events.ts` | Add REACTION_ADDED, REACTION_REMOVED |
| `server/src/socket/socket.dispatcher.ts` | Add dispatchReactionEvent |

### Client

| File | Change |
|------|--------|
| `client/src/modules/messages/api/messages.api.ts` | Add toggleReaction, getReactions |
| `client/src/modules/messages/hooks/useMessages.ts` | Add useToggleReaction mutation |
| `client/src/modules/messages/components/ReactionBar.tsx` | **NEW** — reaction emoji bar |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Add ReactionBar integration |
| `client/src/modules/messages/types/message.ts` | Add reactions, reactionCount fields |
| `client/src/socket/handlers/reaction.handlers.ts` | **NEW** — socket handlers |
| `client/src/socket/eventRouter.ts` | Register reaction handlers |
| `client/src/modules/chat/hooks/useConversationSocket.ts` | Register reaction events |
| `client/src/socket/socket-events.ts` | Add reaction event constants |
