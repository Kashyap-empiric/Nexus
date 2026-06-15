# Mentions — Feature Design

> **Status:** ❌ Not Started
> **Priority:** P0 (Medium)
> **Effort:** 4-6 hours
> **Dependencies:** Notification system (exists), MessageInput (exists)

---

## Overview

The mentions system allows users to @mention other users in messages. When a user types `@username` in a message, the mentioned user receives a notification. Mentions are highlighted in rendered messages. An autocomplete dropdown helps users find and select users to mention.

---

## A. Data Model

### Minimal Changes

No new tables needed. Reuse existing infrastructure:

```prisma
// Add MENTION to existing NotificationType enum
enum NotificationType {
  INVITE_RECEIVED
  INVITE_ACCEPTED
  MEMBER_JOINED
  CHANNEL_CREATED
  MEMBER_REMOVED
  MENTION            // NEW
}
```

### Migration

1. Add `MENTION` to `NotificationType` enum in Prisma schema
2. Run: `npx prisma migrate dev --name add_mention_type`

---

## B. API Design

### No New REST Endpoints

Mention detection happens server-side during message creation. No new endpoints needed.

### Modified Behavior

**`POST /api/conversations/:id/messages`** + **`message:send` handler:**
After creating and persisting the message, parse the content for `@username` patterns. For each valid mention (user exists in conversation members), create a MENTION notification via `createAndDispatch()`.

### Server-Side Mention Detection

```typescript
// In mentions.service.ts

export const parseMentions = (content: string): string[] => {
  // Match @username patterns (alphanumeric + underscore, 3-30 chars)
  // Uses word boundary to avoid matching emails like user@domain.com
  const mentionRegex = /(?<!\w)@(\w{3,30})/g;
  const matches = content.matchAll(mentionRegex);
  return [...new Set(Array.from(matches, m => m[1]))]; // Deduplicated
};

export const resolveMentionedUsers = async (
  usernames: string[],
  conversationId: string
): Promise<{ userId: string; username: string }[]> => {
  // Get all members of the conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true } }
        }
      }
    }
  });
  
  if (!conversation) return [];
  
  // Match usernames to member user records
  return conversation.members
    .filter(m => usernames.includes(m.user.username))
    .map(m => ({ userId: m.user.id, username: m.user.username }));
};
```

### Notification Creation

```typescript
// In message.handler.ts or messages.service.ts

// After creating message:
const usernames = parseMentions(message.content);
const mentionedUsers = await resolveMentionedUsers(usernames, conversationId);

for (const user of mentionedUsers) {
  if (user.userId === message.userId) continue; // Skip self-mentions
  
  await createAndDispatch({
    userId: user.userId,
    type: "MENTION",
    title: `@mentioned by ${message.user.username}`,
    body: message.content.substring(0, 150),
    link: `/conversations/${conversationId}`,
    metadata: {
      messageId: message.id,
      conversationId,
      mentionedBy: message.userId,
      mentionedByUsername: message.user.username,
    },
  });
}
```

---

## C. Frontend Design

### New Components

#### `MentionAutocomplete.tsx`
**Location:** `client/src/modules/messages/components/MentionAutocomplete.tsx`

A dropdown shown when typing `@` in the MessageInput.

**Behavior:**
- Triggered when `@` is typed (at the start of a word or after whitespace)
- After `@`, filters conversation/workspace members by typed prefix
- Shows dropdown with matching users (avatar + username + "username" hint)
- Arrow keys to navigate, Enter/Tab to select, Escape to close
- Selecting inserts `@username ` (with trailing space) at cursor position
- Closes on click outside or when `@` is deleted

**States:**
| State | UI |
|-------|-----|
| Loading members | Spinner in dropdown |
| Results found | User cards with avatar + username |
| No results | "No users found matching '{query}'" |
| `@` typed alone | Show all members (alphabetical) |
| Maximum results | Show "Show all {N} members..." at bottom |

**Design:**
- Positioned above the textarea (like Slack)
- Max height 200px with scroll
- Each item: 32px avatar + username + (if different from username)
- Selected item highlighted with primary color bg

#### `MentionRenderer.tsx`
**Location:** `client/src/modules/messages/components/MentionRenderer.tsx`

A utility component that renders `@username` mentions with special styling.

**Usage:**
```tsx
<MentionRenderer content={message.content} />
```

**Output:**
- Splits content by mention regex
- Wraps `@username` matches in `<span>` with primary color and subtle background
- Non-mention text rendered normally (goes through MarkdownRenderer)

**Styling:**
```css
.mention {
  color: var(--primary);
  background: var(--primary-foreground/10);
  border-radius: 3px;
  padding: 0 2px;
  font-weight: 500;
}
```

### Service Layer

#### `mentions-service.ts`
**Location:** `client/src/modules/messages/services/mentions-service.ts`

```typescript
export const extractMentionPrefix = (text: string, cursorPos: number): string | null => {
  // Look backward from cursor for @username pattern
  const beforeCursor = text.slice(0, cursorPos);
  const match = beforeCursor.match(/(?:^|\s)@(\w*)$/);
  return match ? match[1] : null;
};

export const insertMention = (text: string, cursorPos: number, username: string): { text: string; cursorPos: number } => {
  // Replace the @prefix with @username + trailing space
  const beforeCursor = text.slice(0, cursorPos);
  const afterCursor = text.slice(cursorPos);
  const prefixMatch = beforeCursor.match(/(.*)(?:^|\s)@\w*$/);
  
  if (!prefixMatch) return { text, cursorPos };
  
  const newText = prefixMatch[1] + `@${username} ` + afterCursor;
  return { text: newText, cursorPos: prefixMatch[1].length + username.length + 2 };
};
```

### Updated Components

#### `MessageInput.tsx`
- Import `MentionAutocomplete` and mention service
- Add `mentionQuery` state (string | null) and `mentionResults` state
- On input change: if typing `@`, extract prefix and search members
- Render `<MentionAutocomplete>` when `mentionQuery !== null`
- On select: insert `@username ` at cursor position
- Handle edge cases: `@` in middle of word, double `@`, paste

#### `MessageGroupItem.tsx`
- Replace direct `msg.content` rendering with:
  ```tsx
  <MarkdownRenderer content={formatMentions(msg.content)} />
  ```
- `formatMentions()` wraps `@username` mentions with special span class before markdown rendering

### State Management

#### Hooks (`useMessages.ts`)
```typescript
// Add mention search hook
useMentionSearch: (query: string, conversationId: string) => {
  return useQuery({
    queryKey: ['conversation-members', conversationId],
    queryFn: () => getConversationMembers(conversationId),
    enabled: !!conversationId,
    select: (members) => members.filter(m => 
      m.user.username.toLowerCase().includes(query.toLowerCase())
    ),
  });
};
```

---

## D. Real-Time System

### Socket Events

No new socket events needed. Mentions are delivered through the existing notification system:

```
message:send → server parses mentions
  → For each valid mention:
    → createAndDispatch({ type: "MENTION", ... })
      → Persist Notification record
      → Emit "notification:new" to user:{userId} room
      → Send push notification (if enabled)
```

### Flow Diagram

```
User types message: "Hey @alex check this out"
  → Client shows @alex highlighted in input (autocomplete)
  → User sends message
  → Socket: message:send handler receives it
  → Server persists message
  → Server emits message:new to conversation room
  → Server parses mentions: ["alex"]
  → Server resolves alex to userId in conversation members
  → Server creates MENTION notification for alex
    → Persisted in DB
    → Emitted via socket: notification:new → bell badge updates
    → Push notification sent (if enabled)
  → Alex sees notification in bell / push notification
  → Alex clicks notification → navigates to conversation + message
```

---

## E. Edge Cases

| Scenario | Handling |
|----------|----------|
| **User mentions themselves** | No notification created (skip own mentions) |
| **Mention non-existent username** | Silently ignored (no match in member list) |
| **Mention in edited message** | Parse updated content; only notify NEWLY mentioned users (not already notified ones) |
| **Mention in code block** | Regex should skip content inside triple backticks. Deferred: for MVP, detect but don't highlight. |
| **Multiple mentions of same user** | Single notification per user per message (dedup by userId) |
| **User not in conversation** | No notification (cannot be mentioned) |
| **Username contains special chars** | Restrict regex to `\w{3,30}` (alphanumeric + underscore) |
| **Email address: `user@domain.com`** | Word boundary `(?<!\w)@` prevents matching `@domain` |
| **Mention in reply preview** | Don't create notifications for reply preview text |
| **User leaves conversation** | Don't create notification (membership check at resolution time) |
| **Very long message with many mentions** | Limited to first 10 unique mentions per message |
| **Offline sender** | Socket handler runs on server after message is persisted; mentions work regardless of sender's online state |

---

## F. Implementation Plan

### Phase 1: Server (2 hours)

**Step 1: Enum Migration**
- Add `MENTION` to `NotificationType` in Prisma schema
- Create and run migration

**Step 2: Mention Service**
- Create `server/src/modules/messages/mentions.service.ts`
  - `parseMentions(content)` — regex extraction
  - `resolveMentionedUsers(usernames, conversationId)` — member lookup

**Step 3: Integrate into Message Flow**
- In `messages.service.ts` `createMessage` or socket `message.handler.ts`:
  - After creating message, call `parseMentions()` + `resolveMentionedUsers()`
  - For each valid mention → `createAndDispatch({ type: "MENTION", ... })`

### Phase 2: Client (2-3 hours)

**Step 4: Mention Service**
- Create `mention-service.ts` with `extractMentionPrefix()` and `insertMention()`

**Step 5: MentionAutocomplete Component**
- Create `MentionAutocomplete.tsx`
- Integrate into `MessageInput.tsx`

**Step 6: Mention Highlighting**
- Create `MentionRenderer.tsx` or utility `formatMentions()`
- Integrate into `MessageGroupItem.tsx` / `MarkdownRenderer.tsx`

### Phase 3: Notifications (1 hour)

**Step 7: Notification UI**
- Add `MENTION` case to `NotificationIcon` in `notifications-ui.tsx`
- Icon: `AtSign` from lucide-react
- Title: `@mentioned by {sender}`
- Body: Message preview (truncated to 150 chars)

---

## G. Files Changed Summary

### Server

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add MENTION to NotificationType enum |
| `server/src/modules/messages/mentions.service.ts` | **NEW** — parseMentions, resolveMentionedUsers |
| `server/src/modules/messages/messages.service.ts` | Integrate mention detection in createMessage |
| `server/src/modules/messages/messages.types.ts` | Optional: add mention metadata to MessageDTO |
| `server/src/socket/handlers/message.handler.ts` | Integrate mention detection in socket handler |

### Client

| File | Change |
|------|--------|
| `client/src/modules/messages/components/MentionAutocomplete.tsx` | **NEW** — @mention dropdown |
| `client/src/modules/messages/components/MentionRenderer.tsx` | **NEW** — highlighted mention rendering |
| `client/src/modules/messages/services/mention-service.ts` | **NEW** — prefix extraction, insertion logic |
| `client/src/modules/messages/components/MessageInput.tsx` | Integrate MentionAutocomplete |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Apply mention highlighting |
| `client/src/modules/messages/components/MarkdownRenderer.tsx` | Handle mention spans |
| `client/src/modules/messages/hooks/useMessages.ts` | Add useMentionSearch |
| `client/src/modules/notifications/utils/notifications-ui.tsx` | Add MENTION icon + formatting |
| `client/src/modules/notifications/types/notification.ts` | Add MENTION to NotificationType |
