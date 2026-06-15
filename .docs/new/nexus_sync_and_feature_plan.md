# Nexus System Sync Report & Feature Design Plan

> **Generated:** June 15, 2026
> **Branch:** `feat/notification`
> **Scope:** Notification system (in-app + push), Settings, User Profiles, and planned features

---

## 1. Current System State (Verified from Codebase)

### ✅ Fully Implemented Features

#### Infrastructure
- **Monorepo**: Next.js 16 (App Router) / Express.js 4 / TypeScript full-stack
- **Auth**: Supabase Auth with local ES256 JWKS verification. DB trigger syncs auth users to Prisma `User` table.
- **Database**: PostgreSQL via Prisma 7.x, UUIDv7 primary keys, cursor-based pagination
- **PKG Manager**: npm (client + server), pnpm not used at root
- **Build**: tsup + tsc-alias for server, Next.js build for client
- **Env Vars**: Centralized in `config/env.ts` (both client and server)

#### Messaging Core
- **Direct Messages**: Full CRUD, dmPair deduplication, real-time delivery
- **Messages**: Send, edit, soft-delete, cursor pagination via UUIDv7 `id: desc`
- **Optimistic UI**: `tempId` pattern with rollback on error
- **Read Receipts**: Via `ConversationMember.lastReadMessageId`, socket broadcast
- **Emoji Picker**: `emoji-picker-react` in MessageInput

#### Real-Time (Socket.io)
- **Events**: 15+ typed events via `SOCKET_EVENTS` constants
- **Dispatcher**: Typed dispatch helpers in `socket.dispatcher.ts`
- **Rooms**: `conversation:{id}`, `user:{userId}`, `workspace:{workspaceId}`
- **Presence**: Dual-write to Upstash Redis + in-memory Map fallback
- **Rate Limiting**: Per-socket message rate limiter

#### Workspaces & Channels
- **Workspaces**: CRUD with slug-based routing, OWNER/ADMIN/MEMBER roles
- **Channels**: Public/private via `ChannelVisibility` enum, `#general` protected
- **Member Management**: Role promotion/demotion, member removal, member list panel
- **Invite System**: Secure token-based invites, 24h rotation, batch invite support
- **Notifications**: CHANNEL_CREATED, MEMBER_REMOVED notifications on events

#### In-App Notifications (NEW — Complete)
- **Server Module**: Controller, service, repository, routes, schema under `server/src/modules/notifications/`
- **DB Models**: `Notification` (INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, MEMBER_REMOVED) + `PushSubscription`
- **REST APIs**: `GET /notifications`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`
- **Socket**: `notification:new` event emitted to `user:{userId}` room
- **Client**: BellPopover with unread badge, notifications page with infinite scroll, React Query hooks with optimistic updates

#### Web Push Notifications (NEW — Complete)
- **VAPID Setup**: `web-push` library with `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **Push Service**: `push.service.ts` — `sendPushNotification(userId, payload)`
- **Delivery**: `createAndDispatch()` calls both socket emit and web push
- **Subscription Mgmt**: `POST/DELETE /notifications/push/subscribe` with push rate limiting
- **Security**: Endpoint hijacking prevention (delete cross-user subs on save), `410 Gone` cleanup
- **Service Worker**: `client/public/sw.js` — push event handler, `notificationclick` navigation

#### User Profiles & Settings (NEW — Complete)
- **Profile API**: `GET/PATCH /users/me` — username, displayName, avatarUrl
- **Settings Modal**: `SharedSettingsModal` with tabs: Profile, Appearance, Notifications
- **Profile Settings**: React Hook Form + Zod, avatar URL input, loading/error states
- **Appearance Settings**: Theme toggle (light/dark/system) via next-themes
- **Notification Preferences**: Stored on User model (pushEnabled, dmNotifications, mentionNotifications, channelNotifications)

#### UI Components (NEW)
- **InfoPanel**: Conversation detail panel with About, Members, Pins tabs
- **MarkdownRenderer**: `react-markdown` + `remark-gfm` for message formatting
- **Improved globals.css**: Glassmorphism, custom scrollbars, message animations

### 🟡 Partially Implemented / Open Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Channel read receipts | 🔴 Open | `partnerLastReadMessageId` undefined for channels |
| editMessage non-transactional read | 🔴 Open | `getMessageById` called outside `$transaction` |
| Horizontal scaling (Redis Pub/Sub) | 🔴 Open | In-memory Map prevents multi-instance scaling |
| CreateChannelModal redirect | 🟡 Needs fix | Redirects to `/conversations/` instead of workspace route |
| editMessage stale `updatedAt` | 🟡 Needs fix | Doesn't bump sidebar position |
| Push subscription lifecycle | 🟡 Needs fix | No re-subscribe on `pushsubscriptionchange` |
| Optimistic channel creation | 🔴 Open | Currently poll-based (5s interval) |

### ❌ Not Yet Started

| Feature | Priority | Notes |
|---------|----------|-------|
| Reactions (emoji) | Medium | No model, endpoints, or UI |
| @Mentions | Medium | No mention detection or notifications |
| Pin Messages | Low | No pinning model or UI |
| File Uploads | Low | No file storage or upload UI |
| Message Search | Low | No search infrastructure |
| Typing Indicators | Low | Constants exist, no implementation |
| Onboarding Flow | Low | `isOnboarded` field exists, no UI |
| Thread Panel | Low | No thread model or side panel |

---

## 2. Changes Introduced Today (June 15, 2026)

### New Features

| Feature | Files | Description |
|---------|-------|-------------|
| **In-App Notifications** | `server/src/modules/notifications/*` (6 files) | Full REST + socket notification delivery |
| **Push Notifications** | `server/src/services/push.service.ts` | VAPID-based web push via `web-push` |
| **Service Worker** | `client/public/sw.js` | Push event + notification click handling |
| **BellPopover** | `client/src/modules/notifications/components/BellPopover.tsx` | Bell icon with unread badge + dropdown |
| **Notif. Page** | `client/src/app/(protected)/notifications/page.tsx` | Full notifications page with infinite scroll |
| **Notification Settings** | `client/src/modules/notifications/components/NotificationSettings.tsx` | Push/notification type toggles |
| **Profile Settings** | `client/src/modules/settings/components/ProfileSettings.tsx` | Username, display name, avatar editing |
| **Appearance Settings** | `client/src/modules/settings/components/AppearanceSettings.tsx` | Theme selector |
| **SharedSettingsModal** | `client/src/modules/settings/components/SharedSettingsModal.tsx` | Tabbed settings modal (Profile/Appearance/Notifications) |
| **InfoPanel** | `client/src/modules/chat/components/InfoPanel.tsx` | About/Members/Pins tabs |
| **MarkdownRenderer** | `client/src/modules/messages/components/MarkdownRenderer.tsx` | Message formatting via react-markdown |
| **Batch Invite** | `POST /workspaces/:id/invite-multiple` endpoint | Invite multiple users at once by userId |

### Bug Fixes

| Bug | Fix |
|-----|-----|
| Push toggle race condition | Sequential subscribe/unsubscribe flow |
| Push subscription hijacking | Delete cross-user subscriptions before upsert |
| Push URL normalization | Relative URLs converted to absolute for SW matching |
| Desktop notif. suppression | Only show when not viewing the conversation |
| Invite-by-username broken link | Now generates actual invite token with `forceNew` |

### Schema Changes

- Added `Notification` model with 5 NotificationType enum values
- Added `PushSubscription` model with endpoint uniqueness
- Added to User: `displayName`, `isOnboarded`, `pushNotificationsEnabled`, `dmNotifications`, `mentionNotifications`, `channelNotifications`
- Added to Conversation: `createdBy`, `visibility` (ChannelVisibility enum)

### API Changes

| Route | Method | Change |
|-------|--------|--------|
| `/api/notifications` | GET | New — paginated notification list |
| `/api/notifications/unread-count` | GET | New — unread count |
| `/api/notifications/:id/read` | PATCH | New — mark single as read |
| `/api/notifications/read-all` | PATCH | New — mark all as read |
| `/api/notifications/push/subscribe` | POST/DELETE | New — push subscription mgmt |
| `/api/notifications/preferences` | GET/PUT | New — notification prefs |
| `/api/users/me` | GET/PATCH | Extended — profile management |
| `/api/workspaces/:id/invite-multiple` | POST | New — batch invite |

### Environment Variables Added

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@nexus.app
PUSH_RATE_LIMIT_WINDOW_MS=60000
PUSH_RATE_LIMIT_MAX=5
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

---

## 3. Documentation Audit Results

### Outdated Sections

| Document | Outdated Content | Current Reality |
|----------|-----------------|-----------------|
| `.agents/01-project-context.md` | "No in-app notification system" | ✅ Now complete — bell, inbox, push |
| `.agents/01-project-context.md` | "Phase 1 (core) + Phase 2 (workspaces)" | Notifications + settings + profiles also complete |
| `.agents/03-database-schema.md` | User model missing notification fields | User has displayName, push prefs, onboard status |
| `.agents/03-database-schema.md` | No Notification model listed | Notification + PushSubscription models exist |
| `.agents/03-database-schema.md` | No ChannelVisibility enum | Enum exists with PUBLIC/PRIVATE |
| `.agents/06-phase-2-plan.md` | Notification marked 🟡 not started | ✅ Full implementation complete |
| `.agents/06-phase-2-plan.md` | No profile or settings mention | ✅ Profile & settings implemented |
| `.docs/public-docs/DOCUMENTATION.md` | Missing notifications module | Notifications module exists |
| `.docs/public-docs/file-structure.md` | Missing settings/, notifications/ in module list | Both exist with components |

### Missing Sections

| Document | Missing Content |
|----------|----------------|
| `.docs/public-docs/modules/` | No `notifications.md` module doc |
| `.docs/public-docs/modules/` | No `settings.md` module doc |
| `.docs/public-docs/data-flow.md` | No notification/push data flow diagram |
| `.agents/03-database-schema.md` | No "Notification System" logic handler |

### Contradictions

| Source A | Source B | Issue |
|----------|----------|-------|
| `.agents/01-project-context.md` last updated June 12 | Codebase has June 15 work | Context file is stale |
| `.agents/06-phase-2-plan.md` says notifications 🟡 | `notifications.service.ts` exists and works | Status mismatch |
| `.docs/new/notifications.md` says Phase 3 for push | Push is complete | Plan is outdated vs reality |

---

## 4. Updated Documentation (Summary of Corrected State)

### Current Module Map (Verified)

```
server/src/modules/
├── workspaces/     ✅ Workspace CRUD, channels, members, roles, invites
├── conversations/  ✅ DM mgmt, read receipts, channel queries
├── messages/       ✅ Message CRUD, pagination, soft-delete, reactions (future)
├── notifications/  ✅ NEW — Full notification + push subscription system
├── users/          ✅ Enhanced — Profile management, search
├── invites/        ✅ Token-based invites, 24h rotation, batch invite
└── auth/           ✅ Auth service, repository, access checks

client/src/modules/
├── workspaces/     ✅ NavigationRail, Sidebar, channel mgmt, member list
├── conversations/  ✅ Sidebar, NewConversationModal, EmptyState
├── messages/       ✅ MessageList, MessageGroupItem, MessageInput, MarkdownRenderer
├── notifications/  ✅ NEW — BellPopover, settings, hooks, API, socket handlers
├── settings/       ✅ NEW — ProfileSettings, AppearanceSettings, SharedSettingsModal
├── chat/           ✅ ActiveConversation, NavigationRail, InfoPanel, PresenceIndicator
├── users/          ✅ Profile page, search, user hooks
├── invites/        ✅ Invite modal, processor
├── auth/           ✅ Login, register, OAuth, forgot password
├── landing/        ✅ Static landing page
```

### Current Socket Events (Verified)

```typescript
SOCKET_EVENTS = {
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_READ: "message:read",
  MESSAGE_SEND: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  INITIAL_PRESENCE: "presence:initial",
  CONVERSATION_NEW: "conversation:new",
  CONVERSATION_UPDATE: "conversation:update",
  WORKSPACE_UPDATE: "workspace:update",
  CHANNEL_UPDATE: "channel:update",
  MEMBER_UPDATE: "member:update",
  NOTIFICATION_NEW: "notification:new",
}
```

### Notification Delivery Flow (Corrected)

```
Event Occurs (invite sent, channel created, member removed)
  → createAndDispatch() called
  → 1. Persist Notification record in DB
  → 2. Emit "notification:new" to user:{userId} room (socket)
  → 3. Send web push via sendPushNotification() (fire-and-forget)
       → Check user.pushNotificationsEnabled
       → Fetch active PushSubscriptions
       → Send to each subscription via web-push
       → On 410 Gone: delete subscription
```

---

## 5. Feature Design Plan

### 5.1 Reactions System

#### A. Data Model

```prisma
model Reaction {
  id        String   @id @default(cuid())
  emoji     String                               // Unicode emoji character
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])  // One reaction per user per emoji per message
  @@index([messageId])                  // Fast "get all reactions for message"
  @@index([userId])                     // Fast "get all reactions by user"
}
```

Add to Message model:
```prisma
model Message {
  // ... existing fields
  reactions       Reaction[]
  reactionCount   Int        @default(0)     // Denormalized count cache
  replyCount      Int        @default(0)     // For future thread support
}
```

#### B. API Design

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/conversations/:convId/messages/:msgId/reactions` | Toggle reaction (add/remove) | Conversation member |
| `GET` | `/api/conversations/:convId/messages/:msgId/reactions` | Get aggregated reactions | Conversation member |

**Toggle request:** `{ emoji: "👍" }`
**Toggle response:** `{ action: "added" | "removed", reaction?: Reaction }`

**Aggregated response:**
```json
{
  "reactions": {
    "👍": { "count": 3, "users": [{ "id": "u1", "username": "alex" }], "hasReacted": true },
    "🚀": { "count": 1, "users": [{ "id": "u2", "username": "robin" }], "hasReacted": false }
  }
}
```

Reactions should be included in the existing `GET /messages` response to avoid N+1 queries.

#### C. Frontend Design

**Components:**

- `ReactionBar.tsx` — Row of emoji buttons with count, below each message
  - Each button: emoji + count number, highlighted if user reacted
  - Hover tooltip: "Alex, Robin +1" (who reacted)
  - "+" button opens emoji picker (reuse existing `emoji-picker-react`)
  - Compact layout, wraps to next line if many reactions
- Integrate into `MessageGroupItem.tsx` below message content, above status

**State Management:**
- `useToggleReaction(messageId)` mutation with optimistic update
  - On mutate: immediately toggle the local reaction state
  - On error: rollback to previous state
- Socket handlers: `handleReactionAdded`, `handleReactionRemoved`

#### D. Real-Time System

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `reaction:added` | S → C | `{ messageId, emoji, userId, username }` | User adds reaction |
| `reaction:removed` | S → C | `{ messageId, emoji, userId }` | User removes reaction |

Server dispatches to conversation room via `dispatchReactionEvent(action, convId, payload)`.

#### E. Edge Cases

| Scenario | Handling |
|----------|----------|
| User reacts to deleted message | Allow (reactions cascade on message delete) |
| Concurrent toggle by same user | Unique constraint prevents duplicate; second toggle = delete |
| User leaves conversation | Cascade delete all their reactions (already handled by `onDelete: Cascade`) |
| 100+ reactions on one message | UI wraps to next line; emoji picker scrolls |
| Invalid emoji | Trust client (emoji-picker-react constrains input) |
| Own message reactions | Allow — self-reactions are valid in Slack/Discord |

#### F. Implementation Plan

1. **Migration**: Add Reaction model, fields on Message, run `prisma migrate dev`
2. **Server**: Create `reactions.service.ts`, extend `messages.repository.ts`, add controller handlers + routes
3. **Socket**: Add `REACTION_ADDED`/`REACTION_REMOVED` constants, dispatcher helper
4. **Client**: Create ReactionBar component, API client, hooks, socket handlers
5. **Integrate**: Add to MessageGroupItem, register in eventRouter

**Estimated effort:** 4-6 hours

---

### 5.2 Mentions System

#### A. Data Model

No new tables needed. Use existing infrastructure:

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

#### B. API Design

No new REST endpoints needed. Mention detection happens server-side during message creation.

**Server-side mention detection:**
- Parse `@username` pattern in message content via regex: `/@(\w{3,30})/g`
- For each match, look up user by username in the conversation's member list
- Create MENTION notification for each valid, unique mentioned user

#### C. Frontend Design

**Components:**

- `MentionRenderer.tsx` — Highlight `@username` in message content with primary color + subtle background
- `MentionAutocomplete.tsx` — Dropdown shown when typing `@` in MessageInput
  - Query workspace/conversation members
  - Filter by typed prefix
  - Arrow key navigation + Enter/Tab to select
  - Insert `@username` text at cursor position

**States:**
- Loading: skeleton while members load
- Empty: "No users found" when no matching members
- Selected: Insert `@username`, close dropdown

#### D. Real-Time System

Reuse existing flow:
1. `message:send` handler parses mentions after creating message
2. For each mentioned user → `createAndDispatch({ type: "MENTION", ... })`
3. Socket delivers notification:new → bell badge updates
4. Push notification sent for offline users

#### E. Edge Cases

| Scenario | Handling |
|----------|----------|
| User mentions themselves | No notification created (skip own mentions) |
| Mention non-existent username | Silently ignore (no match in member list) |
| Mention in edited message | Parse updated content, notify newly mentioned users |
| Mention in code block | Skip — markdown-aware parsing needed |
| Multiple mentions of same user | Create single notification (dedup by userId) |
| User not in conversation | No notification (they can't see the message) |
| Username contains special chars | Restrict regex to alphanumeric + underscores |
| Mention in email-like context | `@domain.com` — regex requires word boundary |

#### F. Implementation Plan

1. **Enum**: Add `MENTION` to NotificationType, run migration
2. **Server**: Create `mentions.service.ts` with `parseMentions()` and `resolveMentionedUsers()`
3. **Integrate**: Call mention parsing in `messages.service.ts` `createMessage()`
4. **Client**: Create MentionRenderer, MentionAutocomplete components
5. **Socket**: MENTION notifications delivered via existing notification:new event

**Estimated effort:** 4-6 hours

---

### 5.3 Pin Messages System

#### A. Data Model

```prisma
model PinnedMessage {
  id           String   @id @default(cuid())
  messageId    String
  conversationId String
  pinnedBy     String                     // User ID who pinned it
  createdAt    DateTime @default(now())

  message      Message      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  pinnedByUser User         @relation(fields: [pinnedBy], references: [id])

  @@unique([messageId])                   // A message can only be pinned once
  @@index([conversationId])               // Fast query: "get all pins in this channel"
}
```

#### B. API Design

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/conversations/:convId/pins` | Pin a message | Any member |
| `DELETE` | `/api/conversations/:convId/pins/:messageId` | Unpin a message | Original pinner or workspace admin |
| `GET` | `/api/conversations/:convId/pins` | List pinned messages | Conversation member |

**Pin request:** `{ messageId: string }`
**Pin response:** `{ data: PinnedMessage }` (includes message + pinnedBy user data)

**GET response:** Paginated list of pinned messages with full message content + pinner info.

#### C. Frontend Design

**Components:**
- `PinnedMessagesPanel.tsx` — Full list in InfoPanel "Pins" tab
  - Shows pinned messages with pinner name and date
  - Each item: message content preview, pinned timestamp, "Unpin" button (if authorized)
  - Click message → scroll to message in feed
  - Empty state: "No pinned messages yet"
  - Skeleton loading state
- Pin/Unpin action in MessageGroupItem hover menu
  - "Pin" icon (thumbtack) on hover
  - If already pinned: "Unpin" option
  - If not pinned: "Pin to channel" option
- Pinned indicator on messages that are pinned (small pin icon)

**State Management:**
- `usePinnedMessages(conversationId)` query
- `usePinMessage()` mutation with optimistic update
- `useUnpinMessage()` mutation with optimistic update

#### D. Real-Time System

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `message:pin` | S → C | `{ conversationId, messageId, pinnedBy }` | Message pinned |
| `message:unpin` | S → C | `{ conversationId, messageId }` | Message unpinned |

Server dispatches to conversation room. Clients update pinned messages cache.

#### E. Edge Cases

| Scenario | Handling |
|----------|----------|
| Pin deleted message | Cascade deletes the pin (onDelete: Cascade). Show "This message has been deleted" in pins list. |
| Pin already exists | Return 409 Conflict or treat as idempotent (return existing pin) |
| Unpin by non-author | Allow for workspace admins, deny for regular members |
| 50+ pinned messages | Paginate the pins list (10 per page) |
| Pin in DM | Allow — useful for marking important messages |

#### F. Implementation Plan

1. **Migration**: Add PinnedMessage model, run migration
2. **Server**: Create `pins.service.ts`, controller, routes under conversations module
3. **Socket**: Add pin/unpin event constants + dispatcher
4. **Client**: Create PinnedMessagesPanel, pin/unpin actions, hooks, socket handlers
5. **Integrate**: Add to InfoPanel Pins tab and MessageGroupItem hover menu

**Estimated effort:** 3-5 hours

---

### 5.4 File Upload System

#### A. Data Model

```prisma
model FileAttachment {
  id             String   @id @default(cuid())
  messageId      String
  userId         String
  fileName       String                    // Original filename
  fileSize       Int                       // Size in bytes
  mimeType       String                    // MIME type
  storageUrl     String                    // URL in storage service
  thumbnailUrl   String?                   // For images
  width          Int?                      // For images
  height         Int?                      // For images
  duration       Int?                      // For audio/video
  createdAt      DateTime @default(now())

  message        Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user           User     @relation(fields: [userId], references: [id])

  @@index([messageId])
  @@index([userId])
}
```

Add to Message model:
```prisma
model Message {
  // ... existing
  attachments FileAttachment[]
}
```

**Storage Service**: Use Supabase Storage (already in stack) with bucket per workspace or per user.

#### B. API Design

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/conversations/:convId/files` | Upload file(s) | Conversation member |
| `GET` | `/api/files/:fileId` | Download file | Conversation member |
| `GET` | `/api/conversations/:convId/files` | List shared files | Conversation member |
| `DELETE` | `/api/files/:fileId` | Delete file | Uploader or workspace admin |

**Upload request:** `multipart/form-data` with file(s)
**Upload response:** `{ data: FileAttachment[] }`

**File validation:**
- Max file size: 25MB (configurable)
- Allowed types: images, documents, code files (configurable)
- Scan for malware: Deferred to post-MVP

#### C. Frontend Design

**Components:**

- `FileUploadArea.tsx` — Drag & drop zone at bottom of MessageInput
  - Visual drop zone when file is dragged over
  - Click to open file picker
  - Show selected files with preview thumbnails + remove button
  - Upload progress bar per file
  - Multiple file selection
- `FilePreview.tsx` — Inline file preview in message feed
  - Images: thumbnail with click-to-expand gallery
  - Documents: icon + filename + size + download button
  - Video: player component
  - Code: syntax-highlighted preview
- `FileGallery.tsx` — Full-screen image viewer
  - Navigation arrows (prev/next)
  - Zoom in/out
  - Download button
  - Close on Escape
- `SharedFilesPanel.tsx` — List of files shared in the conversation
  - Accessible from InfoPanel "Pins" tab or dedicated tab
  - Grouped by date
  - Search within files

**States:**
- Uploading: Progress bar, cancel button
- Upload error: Red outline, retry button
- Upload success: Message appears with file preview
- File list empty: "No files shared yet"

**Drag & Drop Flow:**
```
User drags file over MessageInput
  → Drop zone appears with dashed border + "Drop files here"
  → User drops file(s)
  → Files are validated (type, size)
  → Upload starts in parallel
  → Progress bars shown per file
  → On success: message sent with file attachments
  → On error: individual file error shown
```

#### D. Real-Time System

Files are sent as part of the message — the existing message:new event broadcasts the full message with attachments array. No new socket events needed.

**Upload flow:**
1. Client uploads file(s) to `/api/conversations/:convId/files` via multipart POST
2. Server stores file in Supabase Storage, creates FileAttachment records
3. Server returns attachment IDs
4. Client sends message with attachment IDs via existing message:send flow
5. Server associates attachments with message
6. Existing message:new event broadcasts message with attachments

**Alternative (simpler):** Upload file and create message atomically:
1. Client sends message + file(s) together
2. Server processes file upload, creates message, links attachments
3. Broadcasts message:new with attachments

#### E. Edge Cases

| Scenario | Handling |
|----------|----------|
| File too large | Return 413, show client-side validation before upload |
| Invalid file type | Return 400, show error toast |
| Upload interrupted | Client can retry; server garbage-collects orphaned uploads |
| Message with files deleted | Cascade delete all attachments (including storage files) |
| Concurrent upload of same file | Each upload creates separate FileAttachment record |
| Storage service down | Return 503, show "Upload temporarily unavailable" |
| Malicious file name | Sanitize on upload, store safe filename |
| Thumbnail generation | Defer to post-MVP — show file icon for non-image files |

#### F. Implementation Plan

1. **Migration**: Add FileAttachment model, run migration
2. **Storage**: Configure Supabase Storage bucket, create upload helpers
3. **Server**: Create files controller, service, repository, routes
4. **Socket**: No new events — extend existing message payload to include attachments
5. **Client**: Create FileUploadArea (drag-drop), FilePreview, FileGallery components
6. **Integrate**: Add to MessageInput and MessageGroupItem

**Estimated effort:** 8-12 hours (complex: drag-drop, progress, storage integration)

---

## Implementation Priority Matrix

| Feature | User Impact | Effort | Complexity | Dependencies | Priority |
|---------|-------------|--------|------------|--------------|----------|
| Reactions | High | 4-6h | Medium | DB migration, emoji picker (exists) | **P0** |
| @Mentions | High | 4-6h | Medium | Notification system (exists) | **P0** |
| Pin Messages | Medium | 3-5h | Low | InfoPanel (exists) | **P1** |
| File Uploads | High | 8-12h | High | Supabase Storage, new components | **P2** |

### Recommended Build Order

1. **Reactions** — Most visible, self-contained, reuses existing emoji picker
2. **@Mentions** — Leverages notification system, high collaboration value
3. **Pin Messages** — Quick win, InfoPanel Pins tab already built
4. **File Uploads** — Most complex, requires storage setup + file handling components

---
