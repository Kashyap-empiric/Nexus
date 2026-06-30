# Feature: Mentions

## Goal

Allow users to mention other users in messages using `@username` syntax, with autocomplete suggestions, persistent mention records, notifications for mentioned users, and visual highlighting in rendered messages.

---

## Current Status

```
Mostly Implemented
```

Mention parsing, database persistence (`MessageMention` table), notifications (`MENTIONED_IN_MESSAGE`), client-side autocomplete with Tiptap Mention extension (`MentionList` + `mentionSuggestion`), and rendering are all implemented. Message editing does not re-parse mentions.

---

## High-Level Summary

- `MessageMention` model exists in Prisma with unique `[messageId, userId]` constraint.
- `MENTIONED_IN_MESSAGE` notification type exists and is dispatched.
- Mention parsing happens in `createMessage()` using regex `/@([a-zA-Z0-9_.\\-]+)/g`.
- Mentioned users (excluding sender) get `MessageMention` rows created in the message transaction.
- Mentioned users (excluding sender and reply target) receive `MENTIONED_IN_MESSAGE` notifications.
- Client-side autocomplete via Tiptap Mention extension with suggestion dropdown.
- Rendering uses a processed content approach: `@username` is converted to a markdown link `[@username](#mention)` and rendered with a custom `mention-chip` class.
- Editing messages does NOT re-parse mentions (no mention update on edit).
- No dedicated mention list/filter endpoint exists.

---

## Code Locations

```
Backend

server/src/modules/messages/messages.service.ts      — Mention parsing logic
server/src/modules/messages/messages.repository.ts   — MessageMention creation in transaction

Database

server/prisma/schema.prisma

Frontend

client/src/modules/messages/components/MentionList.tsx        — Mention autocomplete list UI
client/src/modules/messages/components/mentionSuggestion.ts   — Suggestion configuration
client/src/modules/messages/components/MessageInput.tsx       — TipTap with Mention extension
client/src/modules/messages/components/LazyMarkdown.tsx       — Mention rendering
client/src/modules/messages/components/MarkdownRenderer.tsx   — Markdown aware of @
```

---

## Database

```prisma
model MessageMention {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId])
  @@index([userId, createdAt])
}

// In NotificationType enum:
// MENTIONED_IN_MESSAGE
```

- Unique constraint `(messageId, userId)` prevents duplicate mention records.
- Indexed on `(userId, createdAt)` for querying mentions by user.
- Cascade delete on message or user deletion.

---

## API

### Endpoints

No dedicated mention endpoints exist. Mention records are created as a side effect of message creation.

### Missing Endpoints

- `GET /mentions` — No endpoint to fetch all mentions for a user.
- `GET /mentions/unread-count` — No unread mention count.
- `PATCH /mentions/read` — No mark-as-read for mentions.

---

## Backend Implementation

### Mention Parsing (`server/src/modules/messages/messages.service.ts`)

```typescript
function parseMentionedUsernames(content: string): string[] {
  const regex = /@([a-zA-Z0-9_.\\-]+)/g;
  const usernames = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    usernames.add(match[1]);
  }
  return Array.from(usernames);
}
```

- Called inside `createMessage()`.
- Parses all `@username` patterns from content.
- Looks up matching users in database.
- Excludes sender from mention list.

### Mention Record Creation (`server/src/modules/messages/messages.repository.ts`)

- `MessageMention.createMany()` added to the message transaction operations.
- Uses `skipDuplicates: true` for safety.
- Only creates records if `mentionedUserIds.length > 0`.

### Mention Notifications (`server/src/modules/messages/messages.service.ts`)

- For each mentioned user (excluding sender):
  - Checks if the mentioned user is also the reply target — if so, skips (already notified via MESSAGE_REPLIED).
  - Calls `createAndDispatch({ type: "MENTIONED_IN_MESSAGE", ... })`.
  - Uses `Promise.allSettled` for concurrent dispatch.

### Notification Category

- `MENTIONED_IN_MESSAGE` is categorized under `REPLIES` in `NOTIFICATION_CATEGORY_MAP`.
- Respects the `replyNotifications` user preference.

---

## Frontend Implementation

### Mention Autocomplete (`client/src/modules/messages/components/mentionSuggestion.ts`, `MentionList.tsx`)

- Tiptap `@tiptap/extension-mention` configured on MessageInput.
- `getMentionSuggestionOptions()` receives `ConversationMember[]` from `useConversationDetailsQuery`.
- Suggestion items: filters members by username starting with query (case-insensitive).
- Renders `MentionList` component with avatar, username, and fullName.
- Tippy.js popup positioned at the cursor.
- Keyboard navigation: ArrowUp/Down to select, Enter/Tab to confirm, Escape to dismiss.

### Mention Rendering (`client/src/modules/messages/components/LazyMarkdown.tsx`)

- Converts `@username` to `[@username](#mention)` before rendering.
- Custom Markdown component renders `a[href="#mention"]` as a `<span className="mention-chip">`.
- Visual style: `text-brand font-medium bg-brand/10 px-1 rounded-sm`.

### MarkdownRenderer (`client/src/modules/messages/components/MarkdownRenderer.tsx`)

- `@` added to `MARKDOWN_CHARS` regex so messages with mentions are routed through the full Markdown renderer (not the plain text shortcut).

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| MessageMention model | ✅ | `schema.prisma` |
| Unique constraint (messageId, userId) | ✅ | `@@unique([messageId, userId])` |
| Mention parsing on create | ✅ | `parseMentionedUsernames()` in messages.service.ts |
| Mention records in message transaction | ✅ | `prisma.messageMention.createMany()` in repository |
| MENTIONED_IN_MESSAGE notification | ✅ | `createAndDispatch` in messages.service.ts |
| Notification excluded for sender | ✅ | `.filter((u) => u.id !== userId)` |
| Notification excluded for reply target | ✅ | `.filter((mentionedId) => mentionedId !== parentMessageUserId)` |
| Notification category (REPLIES) | ✅ | `NOTIFICATION_CATEGORY_MAP` |
| Mention autocomplete UI | ✅ | `MentionList.tsx` + `mentionSuggestion.ts` |
| Mention rendering in messages | ✅ | `LazyMarkdown.tsx` conversion |
| Mention update on edit | ❌ | `editMessage` does not re-parse mentions |
| Mention endpoint (GET /mentions) | ❌ | Not implemented |
| Unread mention count | ❌ | Not implemented |
| Dedicated mention notification preferences | ⚠️ | Uses `replyNotifications` |
| Clear visual distinction for mention notifications | ⚠️ | No special UI treatment in BellPopover |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Send `@alice hello` | Mention record created, notification sent to alice | `parseMentionedUsernames` + `createMany` + `createAndDispatch` | ✅ |
| Send `@alice @alice hello` | Only 1 mention record (unique constraint) | `skipDuplicates: true` | ✅ |
| Send `@nonexistentuser hello` | No mention records created | Query returns empty → no createMany | ✅ |
| Send `@self hello` | No mention record (exclude sender) | `.filter((u) => u.id !== userId)` | ✅ |
| Edit message to add `@bob` | New mention record for bob | ❌ Edit does not re-parse | ❌ |
| Edit message to remove `@alice` | Mention record for alice removed | ❌ Edit does not update mentions | ❌ |
| Delete message with mentions | Mention records cascade-deleted | Cascade delete on Message | ✅ |
| Mention non-channel member | Mention record created (no membership check) | No membership validation | ⚠️ |
| Mention user in DM | Mention record created | Works (also DM users) | ✅ |
| User mentioned but push disabled | In-app notification only | `shouldReceiveNotification` checks preference | ✅ |
| Mention autocomplete opens | Shows matching members list | `getMentionSuggestionOptions` filters members | ✅ |
| Mention renders in message | Highlighted with mention-chip class | `LazyMarkdown` converts to link, styled as span | ✅ |

---

## Current Flow

```
User types @alice in MessageInput
  ↓
Tiptap Mention extension opens suggestion popup
  ↓
mentionSuggestion.ts filters conversation members by query
  ↓
User selects @alice → mention inserted into editor content
  ↓
Message sent via MESSAGE_SEND or POST
  ↓
createMessage():
  1. parseMentionedUsernames(content) → regex extract @usernames
  2. prisma.user.findMany({ where: { username: { in: [...] } } })
  3. Filter out sender
  4. Include mentionedUserIds in message transaction
  5. createMany MessageMention rows (skipDuplicates)
  ↓
Dispatch MENTIONED_IN_MESSAGE notifications to mentioned users
  ↓
Message rendered on client:
  LazyMarkdown converts @alice → [@alice](#mention) → <span class="mention-chip">
```

---

## Missing Pieces

```
□ Mention update on message edit (re-parse and sync MessageMention rows)
□ Dedicated mention list/filter endpoint (GET /mentions)
□ Unread mention count
□ Mention notification visual distinction in BellPopover
□ Membership validation for mentioned users
□ Mention-only tab in BellPopover
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Duplicate mentions | Unique constraint prevents duplicates | ✅ |
| Mention nonexistent user | Ignored (no matching user in DB) | ✅ |
| Mention self | Excluded from list | ✅ |
| Mention in edited message | Not re-parsed | ❌ |
| Mention user in different workspace | Works if user found globally | ⚠️ |
| Mention with special chars in username | Regex handles alphanumeric, _, -, . | ✅ |
| Delete message with mentions | Cascade deletes mention rows | ✅ |
| Mention deleted user | User not found in DB → no mention record | ✅ |

---

## Known Limitations

- Mention update on message edit is not implemented — editing a message to add or remove mentions does not update `MessageMention` rows.
- No membership validation for mentioned users — mentions work for any user in the system, not just conversation members.
- Mention notifications are categorized under `replyNotifications` preference — no dedicated mention notification toggle.
- No dedicated mention list/filter endpoint — mentions are only visible as a side effect of message loading.
- Mention rendering in `LazyMarkdown.tsx` uses a string replacement approach that could match email addresses containing `@`.

---

## Files Inspected

```
server/src/modules/messages/messages.service.ts
server/src/modules/messages/messages.repository.ts
server/prisma/schema.prisma
client/src/modules/messages/components/MessageInput.tsx
client/src/modules/messages/components/MentionList.tsx
client/src/modules/messages/components/mentionSuggestion.ts
client/src/modules/messages/components/LazyMarkdown.tsx
client/src/modules/messages/components/MarkdownRenderer.tsx
client/src/modules/notifications/notifications.service.ts
```
