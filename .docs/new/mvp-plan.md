# Nexus MVP — Ship Plan (Mon–Wed)

> **Deadline:** Wednesday EOD
> **Today:** Monday, June 15, 2026
> **Status:** ✅ = Done, 🟡 = In Progress, ❌ = Not Started

---

## Current State Assessment

### ✅ Already Shippable

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (login/register/OAuth) | ✅ Complete | Supabase, JWT, session management |
| Workspaces CRUD | ✅ Complete | Create, list, channels, members |
| Channels (public/private) | ✅ Complete | Reuses Conversation model with type=CHANNEL |
| Direct Messages | ✅ Complete | Full send/edit/delete/read receipts |
| Message send/edit/delete | ✅ Complete | Socket + REST, optimistic updates, edit/soft-delete |
| Real-time messaging | ✅ Complete | Socket.IO, presence, typing events, read receipts |
| Invites system | ✅ Complete | Link-based + resolvers for all types |
| Notifications (in-app) | ✅ Complete | Bell popover, notification page, socket delivery, repo/service/controller/routes |
| Push subscriptions API | ✅ Complete | Server endpoints, SW registration, push dispatch |
| Web Push (VAPID) | ✅ Complete | push.service.ts, VAPID setup, createAndDispatch pushes |
| DB schema | ✅ Complete | User, Workspace, Message, Conversation, Notification, PushSubscription, Invite, Reaction ❌ |
| Member list panel | ✅ Complete | Right-side panel with presence, roles, DM initiation |
| UI skeleton/loading states | ✅ Complete | Throughout the app |
| Landing page | ✅ Complete | Static marketing page |
| Responsive layout | ✅ Complete | 3-panel → single column on mobile |

### ❌ Missing for MVP

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Reactions** | Users can't react to messages with emoji | Medium | **P0** |
| **@Mentions** | Users can't notify each other in channels | Medium | **P0** |
| **User Profiles** | No profile pages or editing | Medium | **P0** |
| **Inline Replies** | No threaded conversations | Medium | **P0** |
| **Markdown Rendering** | No text formatting (bold, italic, code) | Low | **P1** |
| **UI Polish** | Animations, glassmorphism, refined typography | Medium | **P1** |
| **URL Unfurling** | No link previews | Low | **P2** |
| **Message Search** | No global search (Cmd+K) | High | **P3** |
| **File Upload** | No file/image sharing | High | **P3** |

---

## 3-Day Priority Map

| Day | Focus | Why This Order |
|-----|-------|----------------|
| **Mon** | Reactions (backend + frontend) + User Profiles (backend) | Backend needs DB migrations — do first. Reactions are independent and high visibility. |
| **Tue** | User Profiles (frontend) + @Mentions + Markdown Rendering | Profiles give identity. Mentions give collaboration. Markdown is quick win. |
| **Wed AM** | Inline Replies | Threaded conversations make channels useful. |
| **Wed PM** | UI Polish + Bug Fixes + Testing | Make it look professional before demo. |

---

## Day 1: Monday — Reactions + Profiles Backend

### Goal: Ship Reactions (full stack) + User Profiles API

#### Block 1: Reactions — Database & Backend (3–4 hrs)

**Step 1.1: Prisma migration — Reaction model**

Add to `server/prisma/schema.prisma`:
```prisma
model Reaction {
  id        String   @id @default(cuid())
  emoji     String
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
  @@index([userId])
}
```

Add to `Message` model:
```prisma
reactions Reaction[]
```

Run: `npx prisma migrate dev --name add_reactions`

**Step 1.2: Reaction types & schema**
- Create `server/src/modules/messages/reactions.types.ts`
- Create `server/src/modules/messages/reactions.schema.ts`

**Step 1.3: Reaction service & repository**
- Create `server/src/modules/messages/reactions.service.ts`
  - `toggleReaction(messageId, userId, emoji)` — toggle on/off
  - `getReactions(messageId, userId)` — aggregated by emoji
- Extend `server/src/modules/messages/messages.repository.ts`
  - `findReaction(messageId, userId, emoji)`, `createReaction()`, `deleteReaction()`

**Step 1.4: Reaction controller & routes**
- Add to `server/src/modules/messages/messages.controller.ts`:
  - `toggleReaction` — POST `/api/conversations/:conversationId/messages/:messageId/reactions`
- Add to `server/src/modules/messages/messages.routes.ts`

**Step 1.5: Reaction socket events**
- Add `REACTION_ADDED: "reaction:added"` and `REACTION_REMOVED: "reaction:removed"` to `server/src/shared/socket-events.ts`
- In reaction controller, emit to conversation room
- Extend `server/src/socket/socket.dispatcher.ts`

**Step 1.6: Update `GET /api/conversations/:id/messages`**
- Include `reactions` with user data in the Prisma query

#### Block 2: Reactions — Client UI (2–3 hrs)

**Step 1.7: Add to client socket-events**
- Create `client/src/socket/socket-events.ts` (or add constants)

**Step 1.8: Reaction API client**
- Extend `client/src/modules/messages/api/messages.api.ts`
  - `toggleReaction(conversationId, messageId, emoji)`
  - `getReactions(conversationId, messageId)`

**Step 1.9: Reaction hook**
- Extend `client/src/modules/messages/hooks/useMessages.ts`
  - `useToggleReaction(conversationId, messageId)` — mutation with optimistic update

**Step 1.10: ReactionBar component**
- Create `client/src/modules/messages/components/ReactionBar.tsx`
  - Shows emoji buttons: `[👍 3] [🚀 1] [❤️ 2] [+ Add]`
  - Current user's reaction highlighted
  - Click to toggle; hover tooltip shows who reacted
  - "+" button opens emoji picker

**Step 1.11: Integrate into MessageGroupItem**
- Add ReactionBar below message content in `MessageGroupItem.tsx`

**Step 1.12: Reaction socket handlers**
- Create `client/src/socket/handlers/reaction.handlers.ts`
- Register in `eventRouter.ts` and `useConversationSocket.ts`

#### Block 3: User Profiles — Backend (2 hrs)

**Step 1.13: Prisma migration — User profile fields**
```prisma
model User {
  // ... existing fields
  displayName String?
  bio         String?
}
```
Run migration: `npx prisma migrate dev --name add_user_profile_fields`

**Step 1.14: User profile types & schema**
- Extend `server/src/modules/users/users.types.ts` — `UserProfile`, `UpdateProfileBody`
- Extend `server/src/modules/users/users.schema.ts` — `updateProfileBodySchema`, `getUserParamsSchema`

**Step 1.15: User profile service methods**
- Extend `server/src/modules/users/users.service.ts`:
  - `getUserProfile(userId)` — public profile
  - `getMyProfile(userId)` — own profile (includes email)
  - `updateProfile(userId, data)` — update username, displayName, bio
  - `updateAvatar(userId, avatarUrl)` — update avatar

**Step 1.16: User profile controller & routes**
- Extend `server/src/modules/users/users.controller.ts`:
  - `getUserProfile` — GET `/api/users/:id`
  - `getMyProfile` — GET `/api/users/me`
  - `updateProfile` — PATCH `/api/users/me`
  - `updateAvatar` — PATCH `/api/users/me/avatar`
- Extend `server/src/modules/users/users.routes.ts`

**Step 1.17: Profile socket event**
- Add `USER_PROFILE_UPDATED: "user:profile-updated"` to socket events
- On profile update, emit to `user:{userId}` room

✅ **End of Day 1 deliverable:** Reactions work end-to-end (toggle, real-time sync, reaction bar UI). User profiles API is ready.

---

## Day 2: Tuesday — Profiles UI + Mentions + Markdown

### Goal: Profile pages + @Mentions + Markdown rendering

#### Block 1: User Profiles — Frontend (3 hrs)

**Step 2.1: Profile API client**
- Extend `client/src/modules/users/api/users.api.ts`:
  - `getUserProfile(userId)`, `getMyProfile()`, `updateProfile(data)`, `updateAvatar(avatarUrl)`

**Step 2.2: Profile hooks**
- Create `client/src/modules/users/hooks/useUserProfile.ts`
  - `useUserProfile(userId)`, `useMyProfile()`, `useUpdateProfile()`

**Step 2.3: Profile page**
- Create `client/src/app/(protected)/users/[id]/page.tsx`:
  - Large avatar with presence indicator
  - Username + display name
  - Bio text
  - Status indicator (Online/Away/Busy)
  - "Joined" date
  - "Send Message" button → creates/opens DM
  - States: loading skeleton, loaded, error ("User not found"), self-view ("This is you")

**Step 2.4: Clickable usernames/avatars**
- `MessageGroupItem.tsx` — make username clickable → navigates to `/users/:id`
- `MemberListPanel.tsx` — make members clickable
- `Sidebar.tsx` — click own profile → `/users/:id`

#### Block 2: @Mentions (3 hrs)

**Step 2.5: Mention detection — server-side**
- Create `server/src/modules/messages/mentions.service.ts`:
  - `parseMentions(content: string): string[]` — regex extract `@username`
  - `resolveMentionedUsers(usernames: string[], conversationId: string)` — verify membership
- Extend `messages.service.ts` `createMessage`:
  - After creating message, parse mentions
  - For each valid mention, create notification via `createAndDispatch()`

**Step 2.6: Add MENTION to NotificationType enum**
```prisma
enum NotificationType {
  INVITE_RECEIVED
  INVITE_ACCEPTED
  MEMBER_JOINED
  CHANNEL_CREATED
  MENTION           // NEW
}
```
Run migration.

**Step 2.7: Mention notification on message send**
- In socket handler `message.handler.ts`, after message creation:
  - Parse mentions
  - For each mentioned user (who is a member of the conversation):
    - Create `MENTION` notification via `createAndDispatch()`

**Step 2.8: Mention UI — highlight in messages**
- In `MessageGroupItem.tsx`, render `@username` mentions with a special highlight (primary color, subtle bg)
- Create a simple `MentionRenderer` component or use regex to wrap `@username` in styled spans

**Step 2.9: Mention in MessageInput (basic)**
- Type `@` → show a simple dropdown with user suggestions
- Names fetched from workspace members or conversation members
- Select inserts `@username` text

#### Block 3: Markdown Rendering (1.5 hrs)

**Step 2.10: Install react-markdown**
```bash
cd client && npm install react-markdown remark-gfm
```

**Step 2.11: MarkdownRenderer component**
- Create `client/src/modules/messages/components/MarkdownRenderer.tsx`:
  - Wraps `react-markdown` with `remark-gfm`
  - Custom components:
    - `p` — inline, whitespace-pre-wrap
    - `code` — inline code styling, code blocks with copy button
    - `blockquote` — left border accent
    - `ul`/`ol` — proper list styling
    - `a` — opens in new tab, rel="noopener noreferrer"
  - Security: `react-markdown` strips raw HTML by default
  - Performance: only process if content contains markdown chars (`*`, `_`, `` ` ``, `~~`, `>`, `-`, `1.`, `[`, `http`)

**Step 2.12: Integrate into MessageGroupItem**
- Replace `{msg.content}` with `<MarkdownRenderer content={msg.content} />`

✅ **End of Day 2 deliverable:** Profile pages work, @mentions notify users in real-time, messages render bold/italic/code/links.

---

## Day 3: Wednesday — Replies + UI Polish + Testing

### Goal: Inline replies + polish + ship

#### Block 1: Inline Replies (3 hrs)

**Step 3.1: Prisma migration — parentId on Message**
```prisma
model Message {
  // ... existing
  parentId  String?
  parent    Message?  @relation("MessageReplies", fields: [parentId], references: [id])
  replies   Message[] @relation("MessageReplies")
  replyCount Int      @default(0)
}
```
Run migration.

**Step 3.2: Reply in message service**
- Extend `CreateMessageInput` to accept optional `parentId`
- Validate parent message exists in the same conversation
- Store `parentId` on message creation

**Step 3.3: Reply in message schema**
- Add optional `parentId` to `createMessageBodySchema`

**Step 3.4: Reply UI — action button**
- In `MessageGroupItem.tsx`, add "Reply" button to hover actions (💬 icon)
- Click → sets reply state

**Step 3.5: Reply indicator in MessageInput**
- When replying, show chip: `Replying to @Username` with "X" to cancel
- On send: include `parentId`
- Clear reply state on send

**Step 3.6: Reply rendering in message list**
- If message has `parentId`, show reply reference bar above:
  ```
  ╰── @username: Original message preview...
  This is the reply content
  ```
- Click reference bar → scroll to parent message

#### Block 2: UI Polish (2 hrs)

**Step 3.7: Enhanced message bubbles**
- Professional bubble styling with proper border-radius
- Distinguish sent messages subtly
- Add `slide-in-from-bottom-1` animation for incoming messages

**Step 3.8: Glassmorphism for overlays**
- Apply `backdrop-blur-md bg-background/80` to:
  - Modals (CreateWorkspace, CreateChannel, Invite)
  - Dropdown menus
  - Bell popover
  - Member list panel (mobile)

**Step 3.9: Refined sidebar**
- Active channel indicator with vibrant left-border
- Smooth hover transitions on all items
- Custom thin scrollbar (tailwind-scrollbar or CSS)

**Step 3.10: Loading states**
- Skeleton loaders for:
  - Profile page (avatar circle + text lines)
  - Member list (avatar + name placeholders)
- Animated transitions between states

**Step 3.11: Empty states**
- Channels: "No channels yet — create the first one!" with CTA button
- Members: "No members in this workspace" (edge case, as owner always exists)
- Notifications: "No notifications yet" with bell icon

**Step 3.12: Theme toggle placement**
- Move theme toggle from conversation header to NavigationRail (consistent access)

**Step 3.13: Hover states**
- All interactive elements get `transition-all duration-200`
- Buttons: subtle scale on hover (`hover:scale-[1.02]`)
- Settings: all pages use consistent card layout

#### Block 3: Testing & Bug Fixes (1.5 hrs)

**Step 3.14: Type check**
```bash
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

**Step 3.15: Manual test flow**
1. Register → create workspace → see channels
2. Send message with **bold**, *italic*, `code` → verify rendering
3. @mention another user → verify notification arrives
4. React to a message → verify toggle, real-time sync, reaction bar
5. Reply to a message → verify reference bar, scroll to parent
6. Click user avatar → verify profile page loads
7. Edit profile → verify changes persist
8. Test mobile: sidebar collapse, member panel, message input

**Step 3.16: Fix any issues found**

---

## Detailed File Changes

### Server Files

| # | File | Action | Day |
|---|------|--------|-----|
| 1 | `prisma/schema.prisma` | Add `Reaction` model, `parentId`/`replies` on Message, `MENTION` to NotificationType, `displayName`/`bio` on User | Day 1 |
| 2 | `server/src/modules/messages/reactions.types.ts` | **New** — Reaction types | Day 1 |
| 3 | `server/src/modules/messages/reactions.schema.ts` | **New** — Reaction validation | Day 1 |
| 4 | `server/src/modules/messages/reactions.service.ts` | **New** — toggle, get reactions | Day 1 |
| 5 | `server/src/modules/messages/messages.repository.ts` | Extend: reaction CRUD | Day 1 |
| 6 | `server/src/modules/messages/messages.controller.ts` | Add `toggleReaction` handler | Day 1 |
| 7 | `server/src/modules/messages/messages.routes.ts` | Add reaction route | Day 1 |
| 8 | `server/src/modules/messages/messages.service.ts` | Extend: add parentId support, mention detection | Day 1/3 |
| 9 | `server/src/modules/messages/messages.schema.ts` | Add optional `parentId` | Day 3 |
| 10 | `server/src/modules/messages/mentions.service.ts` | **New** — parse/resolve mentions | Day 2 |
| 11 | `server/src/shared/socket-events.ts` | Add REACTION_ADDED, REACTION_REMOVED, USER_PROFILE | Day 1 |
| 12 | `server/src/socket/socket.dispatcher.ts` | Add reaction dispatch | Day 1 |
| 13 | `server/src/socket/handlers/message.handler.ts` | Add mention notification creation | Day 2 |
| 14 | `server/src/modules/users/users.types.ts` | Extend: profile types | Day 1 |
| 15 | `server/src/modules/users/users.schema.ts` | Extend: profile validation | Day 1 |
| 16 | `server/src/modules/users/users.repository.ts` | Extend: updateUser, findUserById (extend select) | Day 1 |
| 17 | `server/src/modules/users/users.service.ts` | Extend: profile methods | Day 1 |
| 18 | `server/src/modules/users/users.controller.ts` | Extend: profile handlers | Day 1 |
| 19 | `server/src/modules/users/users.routes.ts` | Extend: profile routes | Day 1 |

### Client Files

| # | File | Action | Day |
|---|------|--------|-----|
| 1 | `client/package.json` | Add `react-markdown`, `remark-gfm` | Day 2 |
| 2 | `client/src/socket/socket-events.ts` | **New** — client socket event constants | Day 1 |
| 3 | `client/src/socket/handlers/reaction.handlers.ts` | **New** — reaction socket handlers | Day 1 |
| 4 | `client/src/socket/eventRouter.ts` | Register reaction handlers | Day 1 |
| 5 | `client/src/modules/chat/hooks/useConversationSocket.ts` | Register reaction events | Day 1 |
| 6 | `client/src/modules/messages/api/messages.api.ts` | Extend: reaction API calls | Day 1 |
| 7 | `client/src/modules/messages/hooks/useMessages.ts` | Extend: useToggleReaction | Day 1 |
| 8 | `client/src/modules/messages/types/message.ts` | Add `parentId`, `reactions` | Day 1 |
| 9 | `client/src/modules/messages/components/ReactionBar.tsx` | **New** — reaction emoji bar | Day 1 |
| 10 | `client/src/modules/messages/components/MessageGroupItem.tsx` | Add reaction bar, reply button, mention highlighting, markdown rendering | Day 1-3 |
| 11 | `client/src/modules/messages/components/MarkdownRenderer.tsx` | **New** — markdown → React renderer | Day 2 |
| 12 | `client/src/modules/messages/components/MessageInput.tsx` | Add reply indicator | Day 3 |
| 13 | `client/src/modules/users/api/users.api.ts` | Extend: profile API calls | Day 2 |
| 14 | `client/src/modules/users/hooks/useUserProfile.ts` | **New** — profile hooks | Day 2 |
| 15 | `client/src/app/(protected)/users/[id]/page.tsx` | **New** — profile page route | Day 2 |
| 16 | `client/src/modules/users/components/UserProfileCard.tsx` | **New** — reusable profile card | Day 2 |
| 17 | `client/src/modules/workspaces/components/MemberListPanel.tsx` | Make members clickable → profile | Day 2 |
| 18 | `client/src/modules/conversations/components/Sidebar.tsx` | Click own profile | Day 2 |
| 19 | `client/src/shared/components/layout/AppLayoutShell.tsx` | Move theme toggle, add glassmorphism | Day 3 |
| 20 | `client/src/app/globals.css` | Enhanced color palette, scrollbar styles, animations | Day 3 |

---

## UI Component Architecture (New)

### ReactionBar (`ReactionBar.tsx`)

```
┌──────────────────────────────────┐
│  [👍 3] [🚀 1] [❤️ 5]  [➕]  │
└──────────────────────────────────┘

States:
- No reactions: empty, just [+]
- Has reactions: emoji + count pills, user's reactions highlighted
- Loading: skeleton pills
- Error: hide (graceful degradation)
- Mobile: same layout, touch-friendly 44px targets
```

### MarkdownRenderer (`MarkdownRenderer.tsx`)

```
Input: "Hello **world**! Check `code`"
Output: Hello <strong>world</strong>! Check <code>code</code>

Input: "```\nconst x = 1;\n```"
Output: <pre><code> with copy button

Input: "> This is a quote"
Output: <blockquote> with left accent border

Edge cases:
- Empty content → render nothing
- XSS attempt → react-markdown strips HTML by default
- Very long text → preserve whitespace-pre-wrap
- Link → <a> with target="_blank" rel="noopener noreferrer"
```

### Profile Page (`/users/[id]`)

```
┌─────────────────────────────────────┐
│  ← Back                              │
│                                      │
│       [Large Avatar 🟢]              │
│       Username                       │
│       displayName                    │
│       Bio text...                    │
│                                      │
│       🟢 Online — In a meeting       │
│       📅 Joined June 2026            │
│                                      │
│       [  Send Message  ]             │
│                                      │
│       (This is you) [Edit Profile]   │
└─────────────────────────────────────┘

States:
- Loading: skeleton (avatar circle + 3 text lines)
- Loaded: full profile with all fields
- Error: "User not found" with back button
- Self-view: "This is you" indicator, link to settings
```

### Inline Reply UI

```
╰── @alice: Original message preview text...
This is my reply to the above message

Interaction:
- Click reference bar → smooth scroll to parent message
- Parent message shows "3 replies" badge
- Reply appears inline in feed (not thread panel)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DB migration conflicts | Low | High | Run migrations early (Day 1 morning). Test rollback. |
| Socket event naming collision | Medium | Medium | Use single source of truth in `shared/socket-events.ts`. Sync client/server. |
| Markdown rendering breaks existing messages | Low | Medium | `react-markdown` is safe by default. Test on messages with special chars. |
| Mention regex too greedy | Medium | Low | Test with email addresses (`@domain.com`), ensure `@` in middle of word doesn't trigger. |
| Reaction emoji picker performance | Low | Low | Already have `emoji-picker-react` installed. Reuse existing pattern. |
| Time running out for replies | Medium | High | **Cut if needed.** Replies are P0 but can be simplified: just store parentId, skip reply reference bar rendering for MVP. |

---

## MVP Definition of Done

The MVP is shippable when:

1. ✅ **Reactions:** User can add/remove emoji reactions on any message. Reactions sync in real-time. Reaction bar shows counts and who reacted.
2. ✅ **User Profiles:** Every user has a profile page at `/users/:id` with avatar, username, bio. Usernames/avatars are clickable.
3. ✅ **@Mentions:** Typing `@username` creates a notification for that user. Mentions are highlighted in messages.
4. ✅ **Inline Replies:** User can reply to a message. Replies show a reference bar. Parent message shows reply count.
5. ✅ **Markdown:** Bold, italic, strikethrough, inline code, code blocks, blockquotes, lists render correctly.
6. ✅ **UI Polish:** Consistent glassmorphism on overlays, smooth transitions, professional message bubbles, proper loading/empty states, custom scrollbars.

### What's NOT in MVP (will be called out as "Coming Soon")

- ❌ URL unfurling / link previews
- ❌ File uploads / image sharing
- ❌ Global search (Cmd+K)
- ❌ Thread panel (Discord-style side panel)
- ❌ Rich text input (WYSIWYG editor)
- ❌ Emoji autocomplete (`:smile:` → 😄)
- ❌ Code syntax highlighting
- ❌ User status selector (Online/Away/Busy)
- ❌ Avatar upload (show placeholder avatar for now)
- ❌ Notification preferences (server-side)
- ❌ Appearance settings page
- ❌ Account settings page (password change, etc.)

---

## Demo Script (Wednesday EOD)

1. **Login** — Show landing page → login → land in workspace
2. **Workspace** — Show sidebar with channels, member list
3. **Send message** — Type `Hello **world**!` — shows bold rendering
4. **@Mention** — Type `@alice check this` — alice gets notification in bell
5. **React** — Click 👍 on a message — reaction appears for all users
6. **Reply** — Click 💬 on message — reply indicator shows — send reply — appears inline
7. **Profile** — Click username — profile page loads — has bio, avatar, send message button
8. **Notifications** — Click bell icon — shows unread count and notification list
9. **Mobile** — Shrink viewport — sidebar collapses, member panel slides in
10. **Polish** — Note smooth animations, glassmorphism overlays, professional look

---

## Quick Reference: Commands

```bash
# Server
cd server
npx prisma migrate dev --name add_reactions
npx prisma migrate dev --name add_user_profile_fields
npx prisma migrate dev --name add_mention_type
npx prisma migrate dev --name add_message_parent_id
npx tsc --noEmit

# Client
cd client
npm install react-markdown remark-gfm
npx tsc --noEmit
```

---

> **Last Updated:** June 15, 2026
> **Status:** Planning phase — ready to execute Day 1
