# Text Formatting, Message Replies & Reactions — Implementation Plan

> **Status:** Analysis phase. Planning document.
> **Last updated:** 2026-06-12

---

## Existing Infrastructure Audit

### What Already Exists

| Asset | Location | Status | Notes |
|---|---|---|---|
| Emoji picker in MessageInput | `client/src/modules/messages/components/MessageInput.tsx` | ✅ | `emoji-picker-react` v4.19.1, dark/light theme, popover |
| Message send (socket + REST) | `messages.service.ts` + `message.handler.ts` | ✅ | Dual path: WebSocket primary, REST fallback |
| Message edit | `messages.service.ts` / controller | ✅ | `PATCH` endpoint + `message:update` socket event |
| Message soft-delete | `messages.service.ts` / controller | ✅ | `DELETE` endpoint + `message:delete` socket event |
| Message pagination | `messages.service.ts` | ✅ | Cursor-based via UUIDv7 `id: "desc"` |
| Message optimistic updates | `useMessages.ts` | ✅ | `onMutate` / `onSuccess` / `onError` pattern |
| Align-based DTOs | `messages.types.ts` | ✅ | MessageDTO, MessagePage, CreateMessageResult |
| Socket dispatcher | `socket.dispatcher.ts` | ✅ | `dispatchMessageEvent(action, convId, message, metadata)` |
| Socket event constants | `shared/socket-events.ts` | ✅ | `MESSAGE_NEW`, `MESSAGE_UPDATE`, `MESSAGE_DELETE`, etc. |
| Reaction model (planned) | `prisma/schema.prisma` | ❌ | Does not exist yet |
| Thread/parentId field | `prisma/schema.prisma` | ❌ | Does not exist yet |
| Markdown rendering library | `client/package.json` | ❌ | Not installed |
| Rich text input library | `client/package.json` | ❌ | Not installed |

### Existing Prisma Schema — Message Model (current)

```prisma
model Message {
  id             String               @id
  content        String
  conversationId String
  userId         String
  isEdited       Boolean              @default(false)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  deletedAt      DateTime?
  latestIn       Conversation[]       @relation("ConversationLatestMessage")
  readByMembers  ConversationMember[] @relation("ConversationMemberLastRead")
  conversation   Conversation         @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([conversationId, id])
}
```

### Existing Client Message Type

```typescript
export interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  user: User;
  optimistic?: boolean;
  pending?: boolean;
  isEdited?: boolean;
  deletedAt?: string | null;
}
```

---

## Architecture Decisions

### 1. Text formatting — client-side markdown rendering, plain-text storage

Messages are **stored as plain text** in the database with markdown syntax. Rendering is **client-side only**.

```
Input:  "Hello **world**!"
DB:     "Hello **world**!"       (stored as-is)
Output: "Hello <strong>world</strong>!"  (rendered client-side)
```

**Why NOT rich text (HTML) storage?**
- Rich text stored as HTML is a security risk (XSS vectors in every message)
- Rich text stored as Slate/ProseMirror JSON requires complex serialization
- Markdown is portable, readable in raw form, and easy to edit
- Slack, Discord, and Teams all use markdown or markdown-like syntax
- Existing `content` field is already plain text — no migration needed
- Emoji already works (plain text Unicode emoji)

**Libraries:**

| Library | Purpose | Bundle Size | Notes |
|---|---|---|---|
| `react-markdown` ^9 | Render markdown to React elements | ~15KB gzipped | Standard choice |
| `remark-gfm` | GitHub Flavored Markdown (tables, strikethrough, task lists) | ~5KB | Adds autolink literals, footnotes |
| `rehype-raw` | Re-parse HTML in markdown | ~3KB | Needed if users paste HTML |
| `remark-supersub` | Superscript/subscript | ~1KB | Optional |

Alternatively, `rehype-sanitize` can be added for security if allowing HTML passthrough.

### 2. Markdown rendering scope

**Supported syntax (Phase 1):**

| Syntax | Example | Renders As |
|---|---|---|
| Bold | `**text**` or `__text__` | `<strong>` |
| Italic | `*text*` or `_text_` | `<em>` |
| Strikethrough | `~~text~~` | `<del>` |
| Inline code | `` `code` `` | `<code>` |
| Code blocks | ```` ``` ```` | `<pre><code>` with syntax hint |
| Blockquotes | `> text` | `<blockquote>` |
| Unordered lists | `- item` or `* item` | `<ul><li>` |
| Ordered lists | `1. item` | `<ol><li>` |
| Links | `[text](url)` | `<a href>` — opens in new tab |
| Emoji | `:smile:` → 😄 (optional Phase 2) | Native Unicode |

**NOT in scope (Phase 1):**
- Tables (GFM) — deferred
- Task lists (`[ ]` / `[x]`) — deferred
- Footnotes — deferred
- Heading levels (`#` through `######`) — could cause confusion in messages
- Horizontal rules (`---`) — could cause confusion in messages
- Images (`![alt](url)`) — security risk, deferred

### 3. Message replies — parent-child relationship on Message model

Add a `parentId` field to the Message model for thread replies:

```prisma
model Message {
  // ... existing fields
  parentId    String?               // NEW — ID of the parent message being replied to
  parent      Message?              @relation("MessageReplies", fields: [parentId], references: [id])
  replies     Message[]             @relation("MessageReplies")
  reactionCount Int?                @default(0)  // NEW — denormalized count cache
  // ... existing relations and indexes
}
```

**Three possible reply UX patterns:**

| Pattern | Description | Complexity | Choice |
|---|---|---|---|
| **Inline replies** | Reply appears in the main channel, prefixed with a reference to the parent message ("@User: reply text") | Low | ✅ **Phase 1 — MVP** |
| **Thread panel** | Click a threaded message → opens a side panel with all replies (Discord-like) | High | 📋 **Phase 2** |
| **Thread channels** | Replies create a separate sub-channel (Slack-like) | Very High | ❌ Not planned |

**Phase 1 approach — Inline replies:**
- User hovers a message → clicks "Reply" button
- MessageInput shows: `Replying to @Username` indicator above the input
- On send, `parentId` is included in the payload
- Server stores `parentId`, emits `message:new` with `parentId` in payload
- Client renders reply messages with a visual "replying to" reference bar above the message
- The reply appears in the normal message feed (inline), not in a thread panel

**Phase 2 approach — Thread panel:**
- Click a message with replies → opens a panel on the right side
- Panel shows the parent message + all replies in chronological order
- Real-time updates via socket events
- Unread thread indicator on the parent message

### 4. Reactions — new `Reaction` model with toggle semantics

```prisma
model Reaction {
  id        String   @id @default(cuid())
  emoji     String   // Unicode emoji character(s), e.g. "👍", "🚀", "❤️"
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])  // One reaction per emoji per user per message
  @@index([messageId])
  @@index([userId])
}
```

**Toggle semantics:** Adding the same emoji again removes it:
```
User A reacts 👍 to message 123     →  INSERT Reaction (messageId=123, userId=A, emoji="👍")
User A reacts 👍 to message 123     →  DELETE Reaction (same params)  — toggle off
```

**Why `@@unique([messageId, userId, emoji])`?**
- Prevents duplicate reactions
- Enables the lookup-then-delete / lookup-then-create pattern
- Index on `messageId` enables fast "get all reactions for a message" queries

**Reaction display:**
```
  👍 3    🚀 1    ❤️ 5
  ───    ───     ───
  Alex,  Robin   Alex,
  Sam,   Chris   Robin,
  Chris          Chris
```

- Each emoji shows: emoji character + count + list of who reacted (on hover tooltip)
- Current user's reaction is highlighted (filled emoji vs outline)
- Click to toggle on/off
- Real-time updates via socket events

**Denormalized `reactionCount` on Message** (optional optimization):
- Avoids a COUNT query on every message render
- Updated atomically when reactions are added/removed
- `reactionCount: Int @default(0)` on Message model

### 5. No rich text input library (MVP)

Use a **plain textarea** with markdown syntax, just like Slack and Discord:
- Users type markdown syntax directly (`**bold**`, `*italic*`, `` `code` ``)
- A small formatting toolbar below the input shows available shortcuts
- Preview mode toggle (optional Phase 2) — see rendered output before sending
- No Slate/TipTap/ProseMirror — reduces bundle size and complexity

If a rich text input is desired later, `Slate` is the recommended library (most flexible, used by Notion/Typeform).

### 6. Socket events for reactions and replies

| Direction | Event | Payload | When |
|---|---|---|---|
| S → C | `reaction:added` | `{ reaction: Reaction, messageId, emoji, userId }` | User adds a reaction |
| S → C | `reaction:removed` | `{ messageId, emoji, userId }` | User removes a reaction |
| S → C | `message:reply` | `{ message: Message, parentId }` | (Use existing `message:new` with `parentId`) |

**Decision:** Reuse `message:new` for reply messages (they're just messages with a `parentId`). The client checks for `parentId` and renders accordingly. No new socket event needed for replies in Phase 1.

---

## Data Flow

### 1. Sending a reply (Phase 1 — inline)

```
User clicks "Reply" on a message
  → MessageInput shows "Replying to @Username" chip
  → User types and sends
  → Socket emit `message:send` payload includes `parentId`
  → Server stores message with parentId, emits `message:new` with parentId
  → Client renders message normally, but with a reply reference bar:
      ┌─────────────────────────────────┐
      │ ╰── @username: original message  │  ← reply reference
      │ This is my reply text            │  ← the actual reply
      └─────────────────────────────────┘
```

### 2. Viewing a thread (Phase 2 — panel)

```
User clicks "View thread (3 replies)" on a message
  → Right panel opens with:
      • Parent message at top (pinned)
      • All replies in chronological order below
      • Reply input at bottom
  → Socket joins thread-specific room: `thread:{messageId}`
  → New replies arrive via `message:new` with `parentId`
  → Unread indicator on parent message in main feed
```

### 3. Adding a reaction

```
User hovers a message → clicks "Add reaction" button
  → Emoji picker popover opens (similar to existing MessageInput emoji picker)
  → User selects an emoji
  → POST /api/messages/:messageId/reactions { emoji: "👍" }
  → Server checks if reaction exists:
      IF exists → DELETE (toggle off)
      IF not → INSERT (toggle on)
  → Server emits `reaction:added` or `reaction:removed` to conversation room
  → Client updates reaction bar in-place
```

### 4. Rendering markdown

```
Message received via socket or loaded from history
  → Message content is plain text with markdown syntax
  → MessageGroupItem passes content through react-markdown
  → Output: React elements with formatting
  → Note: Code blocks, blockquotes, and lists get special styling
  
  First render:
    Plain text message → render as plain text (no markdown processing)
  
  After detection:
    If message contains markdown characters → render with react-markdown
    If message is plain text → render directly (avoid markdown overhead)
  
  Optimization: Only process markdown if message contains:
    *, _, `, ~~, >, -, 1., [, http://, https://
```

---

## Implementation Steps

### Phase 1: Backend — Reactions API

#### Step 1: Database migration (Reactions)

- [ ] Add `Reaction` model to Prisma schema:
  ```prisma
  model Reaction {
    id        String   @id @default(cuid())
    emoji     String
    messageId String
    userId    String
    createdAt DateTime @default(now())
    message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([messageId, userId, emoji])
    @@index([messageId])
    @@index([userId])
  }
  ```
- [ ] Add `reactionCount Int @default(0)` to Message model (denormalized count)
- [ ] Add `replyCount Int @default(0)` to Message model (denormalized reply count — avoids COUNT query on every message render)
- [ ] Run migration

#### Step 2: Reaction endpoints

- [ ] `POST /api/conversations/:conversationId/messages/:messageId/reactions` — Toggle a reaction
  - Body: `{ emoji: string }` (Unicode emoji character)
  - Auth required (must be member of the conversation — `requireConversationMember` middleware)
  - Check: if reaction exists → delete. If not → create.
  - Return: `{ action: "added" | "removed", reaction?: Reaction }`
  - On add: increment `message.reactionCount`
  - On remove: decrement `message.reactionCount`
  - **Route nesting:** Follows existing pattern `/conversations/:conversationId/messages/:messageId/reactions` so `requireConversationMember` works without modification

- [ ] `GET /api/conversations/:conversationId/messages/:messageId/reactions` — Get all reactions for a message
  - Returns: `{ reactions: Reaction[] }`
  - Aggregated by emoji: `{ "👍": { count: 3, users: [...], hasReacted: bool } }`
  - Auth required

- [ ] `POST /api/messages/reactions/bulk` — Bulk fetch for multiple messages
  - Body: `{ messageIds: string[] }`
  - Returns: `{ reactions: Record<string, Reaction[]> }`
  - Performance optimization for loading message lists

#### Step 3: Reaction service & repository

- [ ] Create `server/src/modules/messages/reactions.service.ts`
  - `toggleReaction(messageId, userId, emoji)` — toggle logic
  - `getReactions(messageId, userId)` — get aggregated reactions
  - `getBulkReactions(messageIds, userId)` — bulk fetch

- [ ] Extend `server/src/modules/messages/messages.repository.ts`
  - `findReaction(messageId, userId, emoji)` — lookup
  - `createReaction(messageId, userId, emoji)` — insert (within $transaction)
  - `deleteReaction(reactionId)` — delete (within $transaction)
  - `incrementReactionCount(messageId)` / `decrementReactionCount(messageId)` — atomic update
  - `findReactionsByMessageId(messageId)` — get all reactions for message
  - `findReactionsByMessageIds(messageIds)` — bulk get

#### Step 4: Reaction schema & types

- [ ] Create `server/src/modules/messages/reactions.schema.ts`
  - `toggleReactionBodySchema` — `emoji: z.string().length(...).emoji()`

- [ ] Create `server/src/modules/messages/reactions.types.ts`
  - `ReactionResponse` — `{ action, reaction? }`
  - `AggregatedReaction` — `{ emoji, count, users, hasReacted }`
  - `ReactionsMap` — `Record<string, AggregatedReaction>`

#### Step 5: Reaction socket events

- [ ] Add `REACTION_ADDED` and `REACTION_REMOVED` to `SOCKET_EVENTS`
- [ ] In reaction controller, after toggle:
  - Emit `reaction:added` or `reaction:removed` to conversation room
  - Payload: `{ messageId, emoji, userId, count }`
  - Each connected client updates the reaction bar in-place
- [ ] Extend `socket.dispatcher.ts`:
  - `dispatchReactionEvent(action, conversationId, payload)`

### Phase 2: Client — Reaction UI

#### Step 6: Reaction API client

- [ ] Extend `client/src/modules/messages/api/messages.api.ts`
  - `toggleReaction(messageId, emoji)` → POST `/api/messages/:id/reactions`
  - `getReactions(messageId)` → GET `/api/messages/:id/reactions`
  - `getBulkReactions(messageIds)` → POST `/api/messages/reactions/bulk`

#### Step 7: Reaction hooks

- [ ] Extend `client/src/modules/messages/hooks/useMessages.ts`
  - `useToggleReaction(messageId)` — mutation with optimistic update
  - `useReactions(messageId)` — query
  - `useBulkReactions(messageIds)` — query for loading message lists

#### Step 8: Reaction bar component

- [ ] Create `client/src/modules/messages/components/ReactionBar.tsx`
  - Shows emoji buttons in a row below each message
  - Each button: emoji + count
  - Current user's reactions highlighted (filled background)
  - Click → toggle
  - Hover → tooltip with "Alex, Robin +1" (who reacted)
  - "Add reaction" button (+) that opens emoji picker
  - Compact layout (wraps to next line if too many reactions)

- [ ] Integrate into `MessageGroupItem.tsx` (below message content, above message status)

#### Step 9: Reaction socket handler

- [ ] Create `client/src/socket/handlers/reaction.handlers.ts`
  - `handleReactionAdded` — update reaction bar cache in-place
  - `handleReactionRemoved` — update reaction bar cache in-place

- [ ] Register in `eventRouter.ts` and `useConversationSocket.ts`

### Phase 3: Backend — Reply (Thread) Support

#### Step 10: Database migration (parentId)

- [ ] Add `parentId` field to Message model:
  ```prisma
  parentId    String?              // ID of the parent message
  parent      Message?             @relation("MessageReplies", fields: [parentId], references: [id])
  replies     Message[]            @relation("MessageReplies")
  replyCount  Int @default(0)     // Denormalized reply count (avoids COUNT query)
  ```
- [ ] Add index on parent: `@@index([parentId, createdAt])` for fetching thread replies
- [ ] Run migration

#### Step 11: Reply endpoints

- [ ] Extend `POST /api/conversations/:id/messages` — accept optional `parentId`
  - If `parentId` provided: validate parent message exists in same conversation
  - Store `parentId` on the message
  - Return message with `parentId` in payload

- [ ] `GET /api/messages/:messageId/thread` — Get thread replies
  - Returns: `{ messages: MessageDTO[], threadParticipantCount: number }`
  - Paginated (cursor-based, same as main message list)

- [ ] `GET /api/messages/:messageId/thread/unread-count` — Unread thread count
  - Returns: `{ count: number }`
  - Tracked via `lastReadThreadMessageId` on `ConversationMember` (future)

#### Step 12: Reply service & repository

- [ ] Extend `messages.service.ts`
  - `createReply(conversationId, userId, content, parentId)` — validate parent exists, create with parentId
  - `getThreadMessages(messageId, cursor, limit)` — paginated thread replies

- [ ] Extend `messages.repository.ts`
  - `findById` — include `parentId` and reply count
  - `findThreadMessages` — paginated thread query
  - `getReplyCount(messageId)` — count of replies
  - **Also update** `findMessages` (main message list query) to include `reactions` and `replyCount` where applicable

### Phase 4: Client — Text Formatting

#### Step 13: Install markdown library

- [ ] Add `react-markdown` to `client/package.json`
  ```bash
  npm install react-markdown
  ```
- [ ] Add `remark-gfm` for GFM support (tables, strikethrough, task lists)
  ```bash
  npm install remark-gfm
  ```

#### Step 14: Markdown renderer component

- [ ] Create `client/src/modules/messages/components/MarkdownRenderer.tsx`
  ```tsx
  interface MarkdownRendererProps {
    content: string;
    isEdited?: boolean;
  }
  ```
  - Wraps `react-markdown` with `remark-gfm`
  - Custom components for each element type:
    - `p` — renders as inline (not block), preserves `whitespace-pre-wrap`
    - `code` — inline code gets `<code>` styling, code blocks get `<pre><code>` with copy button
    - `blockquote` — left border accent styling
    - `ul` / `ol` — proper list styling
    - `a` — opens in new tab with `rel="noopener noreferrer"`
  - Security: `react-markdown` strips raw HTML by default — no additional sanitizer needed
  - Performance: only process markdown if content contains markdown characters; otherwise render as plain `<span>` (optimization)

- [ ] Update `MessageGroupItem.tsx`:
  - Replace `{msg.content}` with `<MarkdownRenderer content={msg.content} />`
  - Keep existing edit mode (plain textarea — user edits raw markdown)

#### Step 15: Formatting toolbar (optional enhancement)

- [ ] Add a small toolbar below `MessageInput.tsx` textarea:
  ```
  [B] [I] [S] [ ` ] [>] [•] [1.] [Link] [@]
  ```
  - Clicking inserts markdown syntax at cursor position
  - Selected text is wrapped (e.g., `**selected**` for bold)
  - Minimal toolbar, only the most common formatting options
  - Toggleable (hide/show)

### Phase 5: Client — Reply UI (Inline)

#### Step 16: Reply action on messages

- [ ] Add "Reply" button to message hover actions in `MessageGroupItem.tsx`
  - Appears alongside existing Edit/Delete/Copy buttons
  - Click → sets `replyToMessage` state in chatStore or local state

#### Step 17: Reply indicator in MessageInput

- [ ] Update `MessageInput.tsx`:
  - When `replyToMessage` is set:
    - Show a chip above the textarea: `Replying to @Username`
    - Show a preview of the original message (truncated to 1 line)
    - "X" button to cancel reply
  - On send: include `parentId` in the socket payload
  - On send success: clear `replyToMessage` state

- [ ] Update `useSendMessageMutation` to accept optional `parentId`

#### Step 18: Reply rendering in message list

- [ ] Update `MessageGroupItem.tsx`:
  - If message has `parentId`:
    - Fetch parent message content from cache
    - Render reply reference bar above the message:
      ```
      ╰── @username: Original message preview...   (clickable — scrolls to parent)
      This is the reply content
      ```
    - Clicking the reference bar scrolls to the parent message
    - Parent message gets a "3 replies" badge if it has replies

#### Step 19: Reply socket handler

- [ ] Reuse existing `message:new` handler — replies are just messages with `parentId`
- [ ] On receiving a message with `parentId`:
  - Update parent message's reply count in cache
  - If currently viewing the thread, append to thread view
  - Show visual indicator on parent message in main feed

### Phase 6: Client & Server — Thread Panel (Phase 2)

#### Step 20: Thread panel component

- [ ] Create `client/src/modules/messages/components/ThreadPanel.tsx`
  - Right-side panel (similar to MemberListPanel)
  - Parent message pinned at top (non-scrollable)
  - Replies in chronological order (scrollable)
  - Reply input at bottom
  - Close button (X) or Escape
  - Real-time updates via socket

- [ ] Integrate into `ActiveConversation.tsx`:
  - Toggle with "View thread" button on messages with replies
  - Replaces existing member panel when a thread is open

#### Step 21: Thread socket room

- [ ] Add thread room joining: `thread:{messageId}`
  - On opening thread panel → socket.emit("thread:join", { messageId })
  - Server joins socket to `thread:{messageId}` room
  - Thread replies broadcast to both `conversation:{id}` and `thread:{messageId}`
  - On closing thread panel → socket.emit("thread:leave", { messageId })

---

## UI Mockups (text)

### Message with Reactions

```
┌─────────────────────────────────────────────┐
│  Alex  2 min ago                             │
│                                             │
│  This is a **bold** message with `code`     │
│                           (edited)          │
│                                             │
│  [👍 3] [🚀 1] [❤️ 5]  [+ Add]         │
│                                             │
│  ╰── @Robin This is a reply...              │  ← inline reply
│  Great point!                                │
│                                   ✓✓         │  ← read status
│                                             │
│  Hover actions: [➕] [💬] [✏️] [🗑️] [⋯]  │
└─────────────────────────────────────────────┘
```

### Thread Panel (Phase 2)

```
┌─────────────┬──────────────────────────────┐
│             │  #general                     │
│  Sidebar    │  Thread                       │
│             │  ─────────────────────        │
│             │                               │
│             │  [Pinned Parent Message]       │
│             │  Alex  2 min ago              │
│             │  Original message text here   │
│             │  👍 3  💬 5                  │
│             │  ─────────────────────        │
│             │                               │
│             │  Robin  30s ago               │
│             │  ╰─ Alex  Great point!        │  ← reply reference
│             │  Yeah I agree!                │
│             │                               │
│             │  ─────────────────────        │
│             │  ┌──────────────────────┐     │
│             │  │ Reply to thread...    │ 📎😊│
│             │  └──────────────────────┘     │
└─────────────┴──────────────────────────────┘
```

### Markdown Preview

```
Message sent:
  **bold**, *italic*, ~~strikethrough~~, `inline code`

Rendered:
  bold, italic, ~~strikethrough~~, inline code

Code block:
  ```
  const x = 1;
  console.log(x);
  ```
Renders as:
  ┌─────────────────────┐
  │ const x = 1;        │
  │ console.log(x);     │  [Copy]
  └─────────────────────┘

Blockquote:
  > This is a quote
Renders as:
  │ This is a quote
  └─ (vertical bar on left)
```

---

## File Changes Summary

### Server

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Reaction` model, `parentId` + `replies` relation on Message, `reactionCount` field |
| `server/src/modules/messages/reactions.service.ts` | **New** — toggle, get, bulk reactions |
| `server/src/modules/messages/reactions.schema.ts` | **New** — reaction validation |
| `server/src/modules/messages/reactions.types.ts` | **New** — reaction types |
| `server/src/modules/messages/messages.repository.ts` | Extend: reaction CRUD, reply count, thread queries |
| `server/src/modules/messages/messages.service.ts` | Extend: createReply, getThreadMessages |
| `server/src/modules/messages/messages.controller.ts` | Extend: add reaction controller handlers |
| `server/src/modules/messages/messages.routes.ts` | Add reaction and thread routes |
| `server/src/modules/messages/messages.schema.ts` | Add parentId to createMessageBodySchema |
| `server/src/modules/messages/messages.types.ts` | Add parentId to MessageDTO |
| `server/src/shared/socket-events.ts` | Add `REACTION_ADDED`, `REACTION_REMOVED` |
| `server/src/socket/socket.dispatcher.ts` | Add `dispatchReactionEvent` |
| `server/src/socket/handlers/thread.handler.ts` | **New** — thread:join / thread:leave handlers (Phase 2) |

### Client

| File | Change |
|---|---|
| `client/package.json` | Add `react-markdown`, `remark-gfm` |
| `client/src/modules/messages/components/MarkdownRenderer.tsx` | **New** — markdown → React renderer |
| `client/src/modules/messages/components/ReactionBar.tsx` | **New** — reaction emoji bar |
| `client/src/modules/messages/components/ThreadPanel.tsx` | **New** — thread side panel (Phase 2) |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Add reply button, reaction bar, markdown rendering, reply reference bar |
| `client/src/modules/messages/components/MessageInput.tsx` | Add reply indicator, formatting toolbar |
| `client/src/modules/messages/components/MessageList.tsx` | Add thread panel integration |
| `client/src/modules/messages/hooks/useMessages.ts` | Add reaction + reply mutations |
| `client/src/modules/messages/api/messages.api.ts` | Add reaction + thread API calls |
| `client/src/modules/messages/types/message.ts` | Add `parentId`, `reactions`, `reactionCount` |
| `client/src/socket/socket-events.ts` | Add `REACTION_ADDED`, `REACTION_REMOVED` |
| `client/src/socket/handlers/reaction.handlers.ts` | **New** — reaction socket handlers |
| `client/src/socket/eventRouter.ts` | Register reaction handlers |
| `client/src/modules/chat/hooks/useConversationSocket.ts` | Register reaction events |
| `client/src/modules/chat/store/chatStore.ts` | Add `replyToMessage` state |

---

## Implementation Order

| Phase | Step | Feature | Effort |
|---|---|---|---|
| **Phase 1** | 1-5 | Backend: Reactions model, endpoints, socket events | Medium |
| **Phase 2** | 6-9 | Client: Reaction bar, UI, socket handlers | Medium |
| **Phase 3** | 10-12 | Backend: Reply/thread model, endpoints | Medium |
| **Phase 4** | 13-15 | Client: Markdown rendering library + component | Low |
| **Phase 5** | 16-19 | Client: Inline reply UI, MessageInput integration | Medium |
| **Phase 6** | 20-21 | Client + Server: Thread panel (Phase 2 feature) | High |

**Recommended: Start with Phases 1+2 (Reactions) + Phase 4 (Markdown)** — these are independent and together give the most visible feature impact.

---

## Future Considerations

| Feature | Phase | Complexity | Notes |
|---|---|---|---|
| Thread panel (full) | Phase 2 | High | Requires thread room, side panel, unread tracking |
| Thread-specific rooms | Phase 2 | Medium | `thread:{messageId}` room joining |
| `lastReadThreadMessageId` on ConversationMember | Phase 2 | Medium | Unread thread tracking |
| Custom emoji reactions | Phase 3 | High | Upload custom emoji per workspace |
| GIF picker | Phase 3 | Medium | GIPHY or Tenor API integration |
| `/me` actions (italicized action text) | Phase 3 | Low | "Alex waves hi" in chat |
| Message link previews | Phase 3 | Medium | OG metadata unfurling for URLs |
| Polls in messages | Phase 4 | High | Embedded poll component |
| Rich text input (Slate/TipTap) | Phase 4 | High | WYSIWYG editing |
| Emoji autocomplete (`:smile:` → 😄) | Phase 2 | Medium | Type `:` → suggestions dropdown |
| Code syntax highlighting | Phase 2 | Medium | Prism.js or Shiki for code blocks |
