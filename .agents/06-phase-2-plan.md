# Nexus — Phase 2 Plan: Workspaces, Channels & Collaboration

> **Status:** Planned
> **Last Updated:** 2026-06-11
> **Prerequisites:** All Phase 1 features complete (see `.agents/04-phase-1-plan.md`). Phase 1 deferred technical debt should be addressed before or during Day 1 of Phase 2.
>
> **⚠️ IMPORTANT:** Before starting Phase 2 development, read:
> - `.docs/AS_IS_ARCHITECTURE.md` — actual data flows
> - `.docs/TECHNICAL_DEBT.md` — critical race conditions to avoid repeating
> - `.docs/socket.md` — complete socket architecture
> - `.agents/05-agent-boundaries.md` — coding rules & constraints

---

## Project Structure (Post-Phase 2)

```
nexus/
  client/
    src/
      app/
        (protected)/
          workspace/[id]/          # Workspace layout + routing
            channels/[id]/         # Channel view
            members/               # Workspace member management
      modules/
        auth/                      # Existing — no major changes
        chat/                      # Existing — add typing indicators, reactions UI
        users/                     # Expand — user profiles, settings
        workspace/                 # NEW — workspaces & channels module
          api/
          hooks/
          components/
          store/
          types/
        onboarding/                # NEW — onboarding wizard
          components/
          hooks/
          store/
        landing/                   # Existing — update with features
      shared/                      # Existing — minor additions
  server/
    src/
      modules/
        workspaces/                # NEW — workspace CRUD + membership
          workspaces.controller.ts
          workspaces.service.ts
          workspaces.routes.ts
          workspaces.schema.ts
        channels/                  # NEW — channel management (uses existing Conversation model)
          channels.controller.ts
          channels.service.ts
          channels.routes.ts
          channels.schema.ts
        reactions/                 # NEW — emoji reactions
          reactions.controller.ts
          reactions.service.ts
          reactions.routes.ts
          reactions.schema.ts
        profiles/                  # NEW — user profile management
          profiles.controller.ts
          profiles.service.ts
          profiles.routes.ts
          profiles.schema.ts
        users/                     # Existing — add profile endpoint
        conversations/             # Existing — extend for channels
        messages/                  # Existing — add rich text, typing
        invites/                   # Existing — extend resolvers for workspace/channel
      socket/
        handlers/
          typing.handler.ts        # NEW — typing:start / typing:stop
          reaction.handler.ts      # NEW — reaction:add / reaction:remove
        socket.ts                  # Existing — register new handlers
        socket.dispatcher.ts       # Existing — add dispatch helpers
    prisma/
      schema.prisma                # Extended with Workspace, WorkspaceMember, Reaction
      migrations/
```

---

## Phase 2 Feature Scope

| Feature | Description | Day |
|---|---|---|
| Technical Debt Resolution | Fix soft-delete leakage, pagination ordering, race conditions, transactional reads | Day 1 |
| Prisma Schema Migration | Add Workspace, WorkspaceMember, Reaction models, extend Conversation for channels | Day 1 |
| User Profiles | Avatar upload, bio, display name, profile settings page | Day 2 |
| Workspace CRUD | Create, list, switch, update, delete workspaces | Day 2 |
| Workspace Membership | Invite members, manage roles (Owner, Admin, Member), join/leave | Day 2 |
| Public Channels | Create, list, join public channels within workspaces | Day 3 |
| Private Channels | Create, invite-only, visibility gating, member management | Day 3 |
| Channel Messaging | Extend existing message system to work with channel conversations | Day 3 |
| Typing Indicators | Real-time typing status via socket events `typing:start` / `typing:stop` | Day 4 |
| Emoji Reactions | Add/remove reactions with real-time broadcast | Day 4 |
| Rich Text Formatting | Bold, italic, code blocks, lists in messages | Day 4 |
| Onboarding Flow | Welcome wizard, workspace creation prompt, guided tour | Day 5 |
| UI/UX Polish | Navigation rail improvements, responsive design, empty states, animations | Day 5 |

### Out of Scope (Phase 3 / v3)

- File uploads & link unfurling
- Full-text search
- Background jobs (BullMQ)
- WebRTC voice/video
- AI features (summaries, suggestions)
- Analytics & metrics dashboards

---

## Day 1 — Foundation: Technical Debt Cleanup & Schema Migration

> **Theme:** Clean the slate. Fix Phase 1's critical debt before building new features on a broken foundation.

### Pre-Work: Phase 1 Debt Resolution

| Debt Item | Priority | Description | Files to Touch |
|---|---|---|---|
| Soft-Delete Leakage | 🔴 CRITICAL | Add `where: { deletedAt: null }` to `getMessages` query | `server/src/modules/messages/messages.service.ts` |
| Pagination Ordering | 🔴 HIGH | Switch from `createdAt: "desc"` to `id: "desc"` in `getMessages` | `server/src/modules/messages/messages.service.ts` |
| Non-Transactional Reads (edit) | 🔴 CRITICAL | Move `getMessageById` and ownership validation inside `$transaction` | `server/src/modules/messages/messages.service.ts` |
| Race Condition (delete) | 🔴 CRITICAL | Move `nextLatestMessageId` computation inside `$transaction` | `server/src/modules/messages/messages.service.ts` |
| Overloaded Controllers | 🟡 MEDIUM | Extract socket dispatch from controllers into service layer or PubSub helper | `server/src/modules/messages/messages.controller.ts` |

### Prisma Schema Changes

Add three new models to `server/prisma/schema.prisma`:

```prisma
// NEW: Workspace model
model Workspace {
  id        String            @id
  name      String
  slug      String            @unique
  avatarUrl String?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  members   WorkspaceMember[]
  conversations Conversation[]
}

// NEW: WorkspaceMember junction table
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}

model WorkspaceMember {
  id          String        @id
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId, workspaceId])
}

// NEW: Reaction junction table
model Reaction {
  id        String   @id
  emoji     String
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}
```

**Existing model modifications:**

```prisma
// Conversation — extend for channels
model Conversation {
  // ... existing fields ...
  workspaceId String?   // Already exists! Just needs FK constraint
  // Add relation:
  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
}

// User — add profile fields
model User {
  // ... existing fields (id, email, username, avatarUrl, createdAt, updatedAt) ...
  displayName String?
  bio         String?
}
```

### Specific Tasks

- **Morning — Debt Cleanup:**
  1. Add `deletedAt: null` filter to `getMessages` in `messages.service.ts`
  2. Switch `getMessages` ordering from `createdAt: "desc"` to `id: "desc"`
  3. Refactor `editMessage`: wrap ownership validation + update inside `$transaction`
  4. Refactor `deleteMessage`: compute `nextLatestMessageId` inside `$transaction`
  5. Run `npx prisma migrate dev` to generate migration for new models (schema is ready but needs migration)

- **Afternoon — Schema Migration & Foundation:**
  1. Add `Workspace`, `WorkspaceMember`, `Reaction` models to schema
  2. Add `displayName String?` and `bio String?` to User model
  3. Add explicit `workspace` relation to `Conversation`
  4. Run `npx prisma migrate dev --name add_phase2_models`
  5. Create `server/src/modules/workspaces/` directory with route scaffolding
  6. Create `server/src/modules/reactions/` directory with route scaffolding
  7. Create `server/src/modules/profiles/` directory with route scaffolding
  8. Register new route modules in `server/src/app.ts`
  9. Update `.docs/api-reference.md` with new endpoint table stubs

### End of Day 1 Checks

- [ ] `getMessages` filters out soft-deleted messages → soft-deleted messages no longer appear in history
- [ ] `getMessages` orders by `id: "desc"` (UUIDv7) → pagination is monotonic-safe
- [ ] `editMessage` reads + writes inside `$transaction` → no race condition window
- [ ] `deleteMessage` computes next latest message inside `$transaction` → no corrupted `latestMessageId`
- [ ] `npx prisma migrate dev` runs cleanly → new tables `Workspace`, `WorkspaceMember`, `Reaction` exist in DB
- [ ] `Conversation.workspaceId` has proper FK constraint
- [ ] Server starts without errors → new route modules registered
- [ ] All new module directories created with route scaffolding
- [ ] User model has `displayName` and `bio` fields
- [ ] Conversation has proper `workspace` FK relation

---

## Day 2 — User Profiles & Workspaces

> **Theme:** Identity & Space. Give users their own profile space, and let them create organized team spaces.

### Morning — User Profiles

**Backend (`server/src/modules/profiles/`):**

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/profiles/:userId` | GET | Get public user profile (username, bio, avatar, joined date) |
| `PATCH /api/profiles/me` | PATCH | Update own profile (username, displayName, bio, avatarUrl) |
| `POST /api/profiles/me/avatar` | POST | Upload avatar image (to Supabase Storage) |

**Schema (`profiles.schema.ts`):**
- `updateProfileSchema` — `{ displayName?: string (1-50), bio?: string (0-500), username?: string (3-30, alphanumeric) }`
- `userIdParamsSchema` — `{ userId: uuid }`

**Service (`profiles.service.ts`):**
- `getProfile(userId)` — returns user + profile data
- `updateProfile(userId, data)` — updates username, bio, displayName; username uniqueness check
- `uploadAvatar(userId, file)` — uploads to Supabase Storage `avatars/{userId}` bucket, returns URL

**Client — Profile Page (`client/src/app/(protected)/profile/`):**

| Component | Description |
|---|---|
| `ProfilePage.tsx` | View own profile with edit option |
| `ProfileEditForm.tsx` | Inline edit form for username, displayName, bio |
| `AvatarUpload.tsx` | Click-to-upload avatar with preview |
| `UserProfileCard.tsx` | Public profile card (used in conversation headers) |
| `ProfileSettings.tsx` | Full settings page (password change, email, notifications) |

**Client — Profile in Sidebar:**
- Click user avatar in NavigationRail → opens profile dropdown
- Dropdown shows: "Profile", "Settings", "Sign out"
- Profile page at `/profile`

**Files to create:**
- `client/src/modules/users/hooks/useProfile.ts` — TanStack Query hooks for profile CRUD
- `client/src/modules/users/api/profiles.api.ts` — REST API calls
- `client/src/modules/users/components/UserProfileCard.tsx`
- `client/src/modules/users/components/AvatarUpload.tsx`
- `client/src/app/(protected)/profile/page.tsx` — profile page layout

**Socket Events:**
- `user:profile-updated` — broadcast to all user rooms when a user updates their profile (so avatars/names update in real-time)

### Afternoon — Workspace CRUD

**Backend (`server/src/modules/workspaces/`):**

| Endpoint | Method | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET /api/workspaces` | GET | Yes | List workspaces the user is a member of | None |
| `GET /api/workspaces/:id` | GET | Yes + Member | Get workspace details with member list | None |
| `POST /api/workspaces` | POST | Yes | Create a new workspace (creator becomes OWNER) | `workspace:new` (to creator's user room) |
| `PATCH /api/workspaces/:id` | PATCH | Yes + Admin/Owner | Update workspace name, slug, avatar | `workspace:update` |
| `DELETE /api/workspaces/:id` | DELETE | Yes + Owner | Delete workspace (owner only) | `workspace:delete` |

**Schema (`workspaces.schema.ts`):**
- `createWorkspaceSchema` — `{ name (1-100), slug (3-50, alphanumeric-dash) }`
- `updateWorkspaceSchema` — `{ name?, slug?, avatarUrl? }`

**Service (`workspaces.service.ts`):**
- `createWorkspace(userId, data)` — creates workspace + workspaceMember with OWNER role
- ⚠️ **Slug uniqueness:** `slug` has a `@unique` constraint. Catch Prisma `P2002` errors and return a user-friendly 409 response.
- `getUserWorkspaces(userId)` — returns workspaces the user belongs to
- `getWorkspace(workspaceId, userId)` — single workspace if member
- `updateWorkspace(workspaceId, userId, data)` — owner/admin only
- `deleteWorkspace(workspaceId, userId)` — owner only

**Workspace Membership (`workspaces.service.ts`):**

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/workspaces/:id/members` | GET | List all workspace members with roles |
| `POST /api/workspaces/:id/members` | POST | Invite/add a user to workspace |
| `PATCH /api/workspaces/:id/members/:userId` | PATCH | Change user role (admin only) |
| `DELETE /api/workspaces/:id/members/:userId` | DELETE | Remove a member (owner or self) |

**Role hierarchy:**
- `OWNER` — full control: delete workspace, change roles, remove any member
- `ADMIN` — manage channels, manage members (except owners), workspace settings
- `MEMBER` — view channels, send messages, invite others (if enabled)

**Client — Workspace UI (`client/src/modules/workspace/`):**

| Component | Description |
|---|---|
| `WorkspaceSidebar.tsx` | Left sidebar showing channels + DM section for this workspace |
| `WorkspaceSwitcher.tsx` | Dropdown/tray to switch between workspaces (replaces or augments NavigationRail) |
| `WorkspaceCreateModal.tsx` | Modal to create a new workspace (name, slug) |
| `WorkspaceSettingsModal.tsx` | Workspace settings (name, avatar, delete) |
| `MemberList.tsx` | List of workspace members with roles |
| `MemberRoleBadge.tsx` | Role badge (Owner/Admin/Member) |
| `InviteMemberModal.tsx` | Invite users to workspace (reuses invite system) |

**Layout:**
- Workspace route: `/workspace/[workspaceId]/` — wraps channels, members, settings
- Workspace sidebar replaces the flat conversation sidebar when inside a workspace
- DM section still accessible within workspace context

**Socket Events (NEW):**
- `SOCKET_EVENTS.WORKSPACE_NEW: "workspace:new"` — broadcast to user room on creation
- `SOCKET_EVENTS.WORKSPACE_UPDATE: "workspace:update"` — broadcast to workspace member rooms
- `SOCKET_EVENTS.WORKSPACE_DELETE: "workspace:delete"` — broadcast to workspace member rooms
- `SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED: "workspace:member-added"` — notify new member
- `SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED: "workspace:member-removed"` — notify removed member
- `SOCKET_EVENTS.USER_PROFILE_UPDATED: "user:profile-updated"` — broadcast profile changes

**Update shared socket-events.ts** with new event constants.

### End of Day 2 Checks

- [ ] `GET /api/profiles/:userId` returns user profile with bio, avatar, displayName
- [ ] `PATCH /api/profiles/me` updates profile and broadcasts `user:profile-updated`
- [ ] Avatar upload stores file and returns accessible URL
- [ ] Profile page renders at `/profile` with edit functionality
- [ ] `POST /api/workspaces` creates workspace + adds creator as OWNER
- [ ] `GET /api/workspaces` returns only workspaces the user is a member of
- [ ] Workspace switcher renders in sidebar, switching workspaces updates channel list
- [ ] `POST /api/workspaces/:id/members` adds a user to workspace
- [ ] Role changes are enforced on admin/owner-only operations
- [ ] Invite system extended with WORKSPACE type resolver
- [ ] All new socket events are typed and documented

---

## Day 3 — Channels: Public & Private

> **Theme:** Organized Communication. Leverage the existing Conversation model to add channel support within workspaces.

### Morning — Channel Infrastructure

**Key insight:** Channels reuse the existing `Conversation` model (`type = CHANNEL`). The existing message sending, editing, deleting, read receipts, and real-time delivery all work out of the box.

**Backend — Channel Management (`server/src/modules/channels/`):**

| Endpoint | Method | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET /api/workspaces/:id/channels` | GET | Yes + WS Member | List channels in a workspace | None |
| `GET /api/workspaces/:id/channels/:channelId` | GET | Yes + Member | Get channel details + members | None |
| `POST /api/workspaces/:id/channels` | POST | Yes + WS Admin | Create a new channel | `channel:new` (to workspace) |
| `PATCH /api/workspaces/:id/channels/:channelId` | PATCH | Yes + WS Admin | Update channel (name, topic, isPrivate toggle) | `channel:update` |
| `DELETE /api/workspaces/:id/channels/:channelId` | DELETE | Yes + WS Admin | Archive/delete a channel | `channel:delete` |
| `POST /api/workspaces/:id/channels/:channelId/join` | POST | Yes + WS Member | Join a public channel | `channel:member-joined` |
| `POST /api/workspaces/:id/channels/:channelId/leave` | POST | Yes + Member | Leave a channel | `channel:member-left` |
| `POST /api/workspaces/:id/channels/:channelId/members` | POST | Yes + Channel Admin | Add members to private channel | `channel:member-added` |
| `DELETE /.../channels/:channelId/members/:userId` | DELETE | Yes + Channel Admin | Remove member from private channel | `channel:member-removed` |

**Schema (`channels.schema.ts`):**
- `createChannelSchema` — `{ name (1-80, lowercase alphanumeric with hyphens and underscores), isPrivate (boolean, default false), topic? (0-500) }`
- ⚠️ **Slug uniqueness:** If a channel name conflicts with an existing channel in the same workspace, return a 409 error. The `Conversation` table doesn't have a unique constraint on name+workspaceId, so enforce this in the service layer.
- `updateChannelSchema` — `{ name?, topic?, isPrivate? }`
- `channelParamsSchema` — `{ workspaceId: uuid, channelId: uuid }`

**Service (`channels.service.ts`):**

- `createChannel(workspaceId, userId, data)`:
  1. Generate UUIDv7 for the channel ID
  2. Create a `Conversation` record with `type: CHANNEL`, `workspaceId`, `name`, `isPrivate`
  3. Create `ConversationMember` records for the creator (and any initially added members)
  4. Broadcast `channel:new` to workspace room
  5. Auto-join creator's socket to `conversation:{channelId}` room

- `listChannels(workspaceId, userId)`:
  - Public channels: return all
  - Private channels: only return ones where user is a member
  - Include member count, latest message preview

- `joinChannel(channelId, userId)`:
  - Only works for `isPrivate: false` channels
  - Creates `ConversationMember` record
  - Auto-joins user's socket to conversation room
  - Broadcasts `channel:member-joined`

- `leaveChannel(channelId, userId)`:
  - Deletes `ConversationMember` record
  - Removes user from socket room
  - Broadcasts `channel:member-left`

- `addMember(channelId, targetUserId, actorId)`:
  - Works for both public and private channels
  - Actor must be admin of channel or workspace
  - Broadcasts `channel:member-added`

**Utilizing existing infrastructure:**
- Channel messages use the existing `GET /api/conversations/:id/messages` and `POST /api/conversations/:id/messages` endpoints
- Channel read receipts use existing `PATCH /api/conversations/:id/read`
- Channel real-time delivery uses existing socket events (`message:new`, `conversation:update`)
- Channel invites reuse the invite system with `type: CHANNEL` (extend `channelResolver.ts`)

**Socket Events (NEW):**
- `SOCKET_EVENTS.CHANNEL_NEW: "channel:new"` — broadcast to workspace room
- `SOCKET_EVENTS.CHANNEL_UPDATE: "channel:update"` — broadcast to channel room
- `SOCKET_EVENTS.CHANNEL_DELETE: "channel:delete"` — broadcast to workspace room
- `SOCKET_EVENTS.CHANNEL_MEMBER_JOINED: "channel:member-joined"` — broadcast to channel room
- `SOCKET_EVENTS.CHANNEL_MEMBER_LEFT: "channel:member-left"` — broadcast to channel room
- `SOCKET_EVENTS.CHANNEL_MEMBER_ADDED: "channel:member-added"` — notify added user
- `SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED: "channel:member-removed"` — notify removed user

**Extend invite system:**
- `server/src/modules/invites/resolvers/workspaceResolver.ts` — FULL implementation (was throwing NOT_IMPLEMENTED)
- `server/src/modules/invites/resolvers/channelResolver.ts` — FULL implementation (was throwing NOT_IMPLEMENTED)

### Afternoon — Client Channel UI

**Client — Channel Components (`client/src/modules/workspace/components/`):**

| Component | Description |
|---|---|
| `ChannelSidebar.tsx` | Channel list grouped by category (Public / Private) with unread count badges |
| `ChannelListItem.tsx` | Single channel row with # icon, name, unread badge |
| `ChannelHeader.tsx` | Channel header showing name, topic, member count |
| `CreateChannelModal.tsx` | Modal to create channel (name, toggle private, add members) |
| `ChannelSettingsModal.tsx` | Edit channel name, topic, privacy toggling |
| `ChannelMemberList.tsx` | Sidebar showing channel members with presence indicators |
| `ChannelInviteDialog.tsx` | Invite users to channel (via invite link or direct add) |
| `ChannelRoute.tsx` | Main channel view — wraps MessageList + MessageInput with channel header |

**Client — Routes:**
- `/workspace/[workspaceId]/channel/[channelId]` — channel view
- `/workspace/[workspaceId]/` — redirect to first/default channel
- Channel views reuse existing `ActiveConversation`, `MessageList`, `MessageInput` components

**Client — Channel/Room joining on socket connect:**
- Extend `server/src/socket/socket.ts` room-joining logic:
  - Currently: joins all conversation rooms where user is a `ConversationMember`
  - Phase 2: same logic works because channels use the Conversation model
  - Additional: join `workspace:{workspaceId}` room for workspace-level broadcasts
  - Additional: join `user:{userId}` room (existing)

**Invite System Integration:**
- Extend `InviteModal.tsx` to allow generating invite links for workspaces and channels
- Extend `InviteProcessor.tsx` to handle invite landing pages for workspaces/channels
- Update `invite/page.tsx` to redirect to appropriate URL based on invite type

### End of Day 3 Checks

- [ ] `POST /api/workspaces/:id/channels` creates a Conversation with `type: CHANNEL`
- [ ] Public channels are visible to all workspace members
- [ ] Private channels are only visible to members
- [ ] `POST /join` on public channel adds user and broadcasts `channel:member-joined`
- [ ] Channel messages use existing message endpoints and appear in real-time
- [ ] Channel sidebar shows unread count badges
- [ ] Channel header displays name, topic, member count
- [ ] Invite system works for workspace and channel types
- [ ] Workspace invites add user as workspace member
- [ ] Channel resolver invites add user to channel's ConversationMember
- [ ] Socket room joining includes workspace rooms
- [ ] All new socket events documented in `.docs/socket.md`

---

## Day 4 — Typing Indicators, Reactions & Rich Text

> **Theme:** Expressive Communication. Add real-time feedback loops and richer message content.

### Morning — Typing Indicators

**Prerequisites:** Ensure Redis Pub/Sub adapter is installed and configured in socket.ts (for cross-instance typing sync): `npm install @socket.io/redis-adapter`

**Backend (`server/src/socket/handlers/typing.handler.ts`):**

The event constants already exist (`TYPING_START`, `TYPING_STOP`) — they just need handlers.

```typescript
// Client → Server events:
// "typing:start" { conversationId: string }
// "typing:stop"  { conversationId: string }

// Server → Client broadcast:
// "typing:start" { conversationId: string, userId: string, username: string }
// "typing:stop"  { conversationId: string, userId: string }
```

**Throttling logic:**
- Server maintains per-user-per-conversation throttle (re-broadcast only every 3 seconds for `typing:start`)
- `typing:stop` is broadcast immediately (no throttle)
- Server auto-sends `typing:stop` if no `typing:start` received within 5 seconds (stale typing indicator cleanup)
- The server does NOT persist typing events to the database (ephemeral)

**Client — Typing Indicator Components:**

| Component | Description |
|---|---|
| `TypingIndicator.tsx` | Shows "Alice is typing..." or "Alice, Bob are typing..." in the conversation header |
| `useTypingMonitor.ts` | Hook that listens for `typing:start`/`typing:stop` and manages a Set of typing user IDs with auto-expiry |

**Client — Send typing events:**
- `MessageInput.tsx` — emit `typing:start` on input change (throttled to once per 2 seconds per conversation)
- `MessageInput.tsx` — emit `typing:stop` on:
  - Input cleared
  - Message sent
  - User blurs input
  - 5 seconds after last keystroke (client-side cleanup)

**Socket Events:** (pre-existing but now implemented)
- `SOCKET_EVENTS.TYPING_START: "typing:start"`
- `SOCKET_EVENTS.TYPING_STOP: "typing:stop"`

### Afternoon — Emoji Reactions

**Backend (`server/src/modules/reactions/`):`

**Prerequisites:** `GET /api/conversations/:conversationId/messages` must include `reactions` relation in the Prisma query (include user data for each reaction). This is a small update to `messages.service.ts`.

| Endpoint | Method | Auth | Description | Socket Events |
|---|---|---|---|---|
| `GET /api/messages/:messageId/reactions` | GET | Yes + Member | Get all reactions on a message | None |
| `POST /api/messages/:messageId/reactions` | POST | Yes + Member | Toggle a reaction (add if not exists, remove if exists) | `reaction:added` / `reaction:removed` |

**Schema (`reactions.schema.ts`):**
- `toggleReactionSchema` — `{ emoji: string (single emoji, validated) }`
- `messageIdParamsSchema` — `{ messageId: uuid }`

**Service (`reactions.service.ts`):**
- `toggleReaction(messageId, userId, emoji)`:
  1. Look up existing reaction (same messageId + userId + emoji)
  2. If exists → delete it → return `{ action: "removed" }`
  3. If not exists → create it → return `{ action: "added" }`
  4. Broadcast appropriate socket event

**Client — Reaction Components:**

| Component | Description |
|---|---|
| `ReactionBar.tsx` | Shows emoji reactions on a message (inline below message content) |
| `ReactionPicker.tsx` | Emoji picker popover (using a lightweight emoji picker library) |
| `useReactions.ts` | TanStack Query mutation for toggling reactions |

**Interaction:**
- Hover over message → "+" button appears → click opens emoji picker
- Clicking an existing emoji toggles the user's reaction on that emoji
- Reactions appear inline below the message content
- Reactions show count + list of users who reacted (on hover)

**Socket Events (NEW):**
- `SOCKET_EVENTS.REACTION_ADDED: "reaction:added"` — `{ messageId, emoji, userId, username }`
- `SOCKET_EVENTS.REACTION_REMOVED: "reaction:removed"` — `{ messageId, emoji, userId }`

**Message model update:**
- Add `reactions Reaction[]` relation to the Message model query in `getMessages` so reactions are fetched alongside messages
- Messages returned from API include `reactions` array: `{ id: string, messageId, emoji, userId, user: { username } }`

### Afternoon — Rich Text Formatting

**Approach:** Use a lightweight markdown-to-HTML approach (no heavy rich text editor). Messages are stored as plain markdown in `content` and rendered client-side. **No schema changes needed** — `content` works as-is.

**Install dependencies:** `npm install react-markdown remark-gfm` in the client directory

**Backend changes:**
- No schema changes — `content` field already stores the markdown string
- No server-side parsing — rendering is purely client-side

**Client — Rich Text Rendering:**

| Component | Description |
|---|---|
| `RichTextRenderer.tsx` | Renders markdown content to HTML: bold, italic, strikethrough, code blocks, inline code, bullet lists, numbered lists, blockquotes |
| `RichTextInput.tsx` | Enhanced MessageInput that supports markdown shortcuts (Ctrl+B for bold, Ctrl+I for italic, / for commands) |

**Features:**
- **Bold:** `**text**` or `__text__`
- **Italic:** `*text*` or `_text_`
- **Strikethrough:** `~~text~~`
- **Code inline:** `` `code` ``
- **Code block:** ```` ```code``` ````
- **Lists:** `- item` or `1. item`
- **Blockquote:** `> quote`
- **Preview mode:** Toggle between edit and rendered preview

**Library choices:** Use `react-markdown` with `remark-gfm` for rendering. Keep it lightweight.

**Message display update:**
- Replace `MessageGroupItem.tsx` text rendering with `<RichTextRenderer content={message.content} />`
- Show "(edited)" badge on edited messages (existing behavior)

**Additional improvements:**
- Message thread preview in sidebar shows truncated plain text (strip markdown)
- Copy message preserves markdown source

### End of Day 4 Checks

- [ ] `typing:start` event emitted from client on input change (throttled)
- [ ] `typing:stop` event emitted on send/blur/clear
- [ ] Server broadcasts typing events to conversation room (throttled, with auto-expiry)
- [ ] TypingIndicator component shows "{user} is typing..." in conversation header
- [ ] `POST /api/messages/:messageId/reactions` toggles reaction correctly (add/remove)
- [ ] `reaction:added` and `reaction:removed` socket events broadcast to conversation room
- [ ] ReactionBar renders inline below messages with emoji + count
- [ ] Clicking existing reaction toggles it off
- [ ] `react-markdown` renders bold, italic, code, lists, blockquotes correctly
- [ ] `MessageInput` supports markdown shortcuts
- [ ] Preview mode shows rendered markdown
- [ ] All new socket events added to `.docs/socket.md`
- [ ] All new endpoints added to `.docs/api-reference.md`

---

## Day 5 — Onboarding, UI/UX Polish & Integration

> **Theme:** Delight & Cohesion. Polish the experience, guide new users, and ensure everything works together seamlessly.

### Morning — Proper Onboarding Flow

**Client — Onboarding Module (`client/src/modules/onboarding/`):**

| Component | Description |
|---|---|
| `OnboardingWizard.tsx` | Multi-step wizard shown on first login |
| `WelcomeStep.tsx` | "Welcome to Nexus!" — brief intro, branding |
| `CreateProfileStep.tsx` | Set display name, upload avatar, write bio |
| `CreateWorkspaceStep.tsx` | Create first workspace (or skip) |
| `InviteMembersStep.tsx` | Invite team members to workspace |
| `ChannelSetupStep.tsx` | Create first channels (#general, #random) |
| `TourStep.tsx` | Guided tour overlay highlighting key UI elements |

**State management:**
- `onboardingStore.ts` — Zustand store tracking `{ currentStep: number, completed: boolean }`
- `isOnboardingCompleted` persisted to localStorage + server-side user metadata
- First-time detection: check `user?.metadata?.onboardingCompleted` on login

**Onboarding flow:**
1. User registers → logs in → checks `onboardingCompleted` flag
2. If not completed → redirect to `/onboarding`
3. Step 1: Welcome screen with branding and "Get Started" CTA
4. Step 2: Profile setup (name, avatar, bio) — calls `PATCH /api/profiles/me`
5. Step 3: Create first workspace — calls `POST /api/workspaces`
6. Step 4: Invite members (optional) — calls invite endpoints
7. Step 5: Create first channels (optional, pre-filled #general) — calls channel create
8. Step 6: Guided tour overlay — highlights sidebar, message input, workspace switcher
9. Complete → redirect to `/workspace/[id]/channel/[generalId]`

**Backend:**
- `PATCH /api/profiles/me/onboarding` — mark onboarding as completed (scaffold as 501 stub on Day 2, full implementation on Day 5)
- `user.metadata.onboardingCompleted` — stored in Supabase Auth user metadata or User model

**Landing page update:**
- Add feature showcase sections: workspaces, channels, real-time messaging, rich text
- Add pricing or "coming soon" for future features
- Improve CTA flow from landing → register

### Afternoon — UI/UX Polish & Integration Testing

**Navigation & Layout Improvements:**

| Task | Description |
|---|---|
| **Navigation Rail** | Update `NavigationRail.tsx` with workspace icons, profile avatar, settings gear, theme toggle |
| **Workspace Switcher** | Animated dropdown with workspace list, create button, current workspace highlight |
| **Responsive Design** | Ensure workspace + channel views work on mobile (collapsible sidebar, bottom navigation) |
| **Animations** | Add micro-interactions: message fade-in, sidebar slide, modal transitions, reaction pop |
| **Empty States** | Design empty states for: no channels yet, no messages, no workspace members |
| **Loading Skeletons** | Add loading skeletons for workspace list, channel list, member list |
| **Error States** | Add error boundaries for workspace/channel loading failures with retry CTAs |
| **Keyboard Shortcuts** | `Ctrl+K` for quick switcher, `Ctrl+N` for new channel, `Escape` to close modals |
| **Theme** | Ensure Shadcn UI Zinc theme is consistent across all new components |

**Quick Switcher (`client/src/shared/components/QuickSwitcher.tsx`):**
- `Ctrl+K` / `Cmd+K` opens command palette
- Search across: workspaces, channels, users, actions
- Keyboard navigable (arrows + Enter)
- Shows recent items first

**System-wide updates:**

| File | Change |
|---|---|
| `client/src/modules/chat/components/Sidebar.tsx` | Update to show workspace-aware sidebar with channel list + DM section |
| `client/src/modules/chat/components/NavigationRail.tsx` | Add workspace icons, profile menu |
| `client/src/app/(protected)/layout.tsx` | Reorganize layout for workspace context (sidebar + main + workspace switcher) |
| `client/src/app/globals.css` | Add animation keyframes, scrollbar styling, custom utilities |
| `client/src/modules/chat/components/EmptyState.tsx` | Update with onboarding CTA for first-time users |
| `client/src/modules/chat/components/MessageList.tsx` | Add message animation, smooth scroll to bottom |

**Documentation Updates:**

| File | Update |
|---|---|
| `.docs/socket.md` | Add new socket events: typing, reactions, workspace, channel, profile |
| `.docs/api-reference.md` | Add all new endpoints: profiles, workspaces, channels, reactions |
| `.docs/data-flow.md` | Add workspace, channel, reaction, typing data flows with diagrams |
| `.docs/architecture.md` | Update ER diagram with Workspace, WorkspaceMember, Reaction tables |
| `.docs/state-management.md` | Update with new Zustand stores (workspace, onboarding) |
| `.docs/error-handling.md` | Update with new endpoint errors |
| `.docs/context.md` | Update feature status, endpoint list, schema overview |
| `.docs/public-docs/DOCUMENTATION.md` | Add workspace, channel, reactions modules |
| `.docs/public-docs/modules/` | Create/update module docs for each new module |
| `.docs/incremental-logs.md` | Log Phase 2 progress |
| `.agents/01-project-context.md` | Update with Phase 2 state |
| `.agents/03-database-schema.md` | Add new models, relations, indexes |

**Integration Test Scenarios:**

```
1.  User registers for the first time          ✅
2.  Onboarding wizard guides through setup      ✅
3.  User creates a workspace                    ✅
4.  User creates #general and #random channels  ✅
5.  User invites another user to workspace      ✅
6.  Invited user joins workspace                ✅
7.  Invited user joins a public channel         ✅
8.  Invited user sends a message in channel     ✅
9.  Original user sees message in real-time     ✅
10. Admin creates a private channel              ✅
11. Admin adds specific members                  ✅
12. Non-member tries to view private channel     ✅ (403)
13. User reacts to a message with emoji          ✅
14. Other user sees reaction in real-time        ✅
15. User types — typing indicator appears        ✅
16. User sends bold text — renders correctly     ✅
17. User edits profile — updates everywhere      ✅
18. User switches workspaces                     ✅
19. Read receipts work in channels               ✅
20. Presence indicators work in channels         ✅
```

### End of Day 5 Checks

- [ ] Onboarding wizard shows on first login and completes successfully
- [ ] Onboarding persists (not shown again after completion)
- [ ] Navigation rail shows workspace icons with active state
- [ ] Workspace switcher animates and switches correctly
- [ ] Channel sidebar renders with public/private sections
- [ ] Quick switcher (`Ctrl+K`) searches workspaces, channels, users
- [ ] Empty states render for no-channels, no-messages scenarios
- [ ] Loading skeletons render during data fetching
- [ ] All pages are responsive (mobile + desktop)
- [ ] Keyboard shortcuts work across the app
- [ ] All integration scenarios pass
- [ ] All documentation files updated
- [ ] `.docs/socket.md` contains all 15+ socket events
- [ ] `.docs/api-reference.md` contains all endpoints

---

## Phase 2 Scope Summary

| Feature | In Scope | Notes |
|---|---|---|
| Technical Debt Cleanup | ✅ | Soft-delete, pagination, race conditions, transactional reads |
| User Profiles | ✅ | Bio, avatar upload, display name, profile page |
| Workspaces | ✅ | CRUD, membership, roles (Owner/Admin/Member), switching |
| Public Channels | ✅ | Open channels within workspaces |
| Private Channels | ✅ | Invite-only channels with member management |
| Channel Messaging | ✅ | Reuses existing Message infrastructure |
| Typing Indicators | ✅ | Real-time via socket events |
| Emoji Reactions | ✅ | Toggle reactions with real-time broadcast |
| Rich Text Formatting | ✅ | Markdown-based (bold, italic, code, lists) |
| Onboarding Flow | ✅ | Multi-step wizard, guided tour |
| UI/UX Polish | ✅ | Navigation, responsive, animations, empty states, shortcuts |
| | | |
| File Uploads | ❌ Phase 3 | — |
| Full-Text Search | ❌ Phase 3 | — |
| Background Jobs | ❌ Phase 3 | BullMQ, transactional emails |
| Voice/Video | ❌ Phase 3 | WebRTC |
| AI Features | ❌ Phase 3 | Summaries, suggestions |

---

## Key Architectural Decisions

1. **Channels reuse the Conversation model.** `type: CHANNEL` + `workspaceId` FK. All existing message infrastructure (send, edit, delete, read receipts, real-time delivery) works without modification.

2. **Workspace membership is separate from channel membership.** A user must be a workspace member to see its channels. Channel membership controls access to individual channels.

3. **Single emoji picker for reactions.** Use a lightweight, well-maintained emoji picker (e.g., `emoji-picker-react` or custom). No need for a proprietary solution.

4. **Client-side markdown rendering.** Messages are stored as markdown strings. Rich text is rendered client-side using `react-markdown` + `remark-gfm`. This keeps the backend simple and doesn't lock us into a specific rich text format.

5. **Throttled typing indicators.** Server-side 3-second throttle + 5-second auto-expiry prevents flooding. Client-side 2-second throttle prevents excessive socket emissions.

6. **Toggle semantics for reactions.** Lookup-then-delete or lookup-then-create pattern (not upsert) so the server knows which socket event to broadcast (`reaction:added` vs `reaction:removed`).

7. **Invite system extension.** Phase 1's `WORKSPACE` and `CHANNEL` invite resolvers were scaffolded as stubs. Phase 2 fills in the full implementation.

8. **Phased route registration.** New route modules are registered in Day 1 (scaffolding) but the actual handlers are implemented on their respective days. This prevents merge conflicts and allows incremental development.

---

## Database Schema Additions

```prisma
// New models to add in Day 1 migration:

model Workspace {
  id        String            @id
  name      String
  slug      String            @unique
  avatarUrl String?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  members       WorkspaceMember[]
  conversations Conversation[]
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}

model WorkspaceMember {
  id          String        @id
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId, workspaceId])
}

model Reaction {
  id        String   @id
  emoji     String
  messageId String
  userId    String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}

// Modifications to existing models:
// Conversation → add: workspace Workspace? @relation(fields: [workspaceId], references: [id])
// Message → add: reactions Reaction[]

// Modifications to existing User model:
// User → add: displayName String?
// User → add: bio String?
```

---

## Socket Events: Complete Phase 2 List

### New Events

| Direction | Event | Payload | Source | Consumers |
|---|---|---|---|---|
| **C → S** | `typing:start` | `{ conversationId }` | `typing.handler.ts` | — |
| **C → S** | `typing:stop` | `{ conversationId }` | `typing.handler.ts` | — |
| **S → C** | `typing:start` | `{ conversationId, userId, username }` | `typing.handler.ts` | `useTypingMonitor` |
| **S → C** | `typing:stop` | `{ conversationId, userId }` | `typing.handler.ts` | `useTypingMonitor` |
| **S → C** | `reaction:added` | `{ messageId, emoji, userId, username }` | `reactions.controller.ts` | `useConversationSocket` |
| **S → C** | `reaction:removed` | `{ messageId, emoji, userId }` | `reactions.controller.ts` | `useConversationSocket` |
| **S → C** | `workspace:new` | `Workspace object` | `workspaces.controller.ts` | `useGlobalSocket` |
| **S → C** | `workspace:update` | `{ workspace }` | `workspaces.controller.ts` | `useGlobalSocket` |
| **S → C** | `workspace:delete` | `{ workspaceId }` | `workspaces.controller.ts` | `useGlobalSocket` |
| **S → C** | `workspace:member-added` | `{ workspaceId, userId, role }` | `workspaces.controller.ts` | `useGlobalSocket` |
| **S → C** | `workspace:member-removed` | `{ workspaceId, userId }` | `workspaces.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:new` | `Conversation (CHANNEL) object` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:update` | `{ conversation }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:delete` | `{ conversationId }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:member-joined` | `{ conversationId, userId, username }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:member-left` | `{ conversationId, userId }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:member-added` | `{ conversationId, userId, addedBy }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `channel:member-removed` | `{ conversationId, userId }` | `channels.controller.ts` | `useGlobalSocket` |
| **S → C** | `user:profile-updated` | `{ userId, username, avatarUrl, displayName }` | `profiles.controller.ts` | `useGlobalSocket` |

### Existing Events (unmodified, still active)

| Direction | Event | Notes |
|---|---|---|
| **C → S** | `message:send` | Unchanged |
| **S → C** | `message:new` | Unchanged — works for channels too |
| **S → C** | `message:update` | Unchanged |
| **S → C** | `message:delete` | Unchanged |
| **S → C** | `message:read` | Unchanged — works for channels too |
| **S → C** | `user:online` | Unchanged |
| **S → C** | `user:offline` | Unchanged |
| **S → C** | `presence:initial` | Unchanged |
| **S → C** | `conversation:new` | Unchanged — fires for new channels too |
| **S → C** | `conversation:update` | Unchanged — fires for channel updates too |

### Room Strategy (Extended)

| Room Pattern | Purpose | Joined When |
|---|---|---|
| `conversation:{id}` | Broadcasting messages, reactions, typing, read receipts (existing) | On connect (auto-join all member conversations) |
| `user:{userId}` | Targeted notifications (existing) | On connect |
| `workspace:{workspaceId}` | NEW — workspace-level broadcasts (channel create/delete, member changes) | On connect (auto-join for all user's workspaces) |

---

## REST Endpoints: Complete Phase 2 List

### New Endpoints

| # | Method | Route | Auth | Day |
|---|---|---|---|---|
| 1 | `GET` | `/api/profiles/:userId` | Yes | 2 |
| 2 | `PATCH` | `/api/profiles/me` | Yes | 2 |
| 3 | `POST` | `/api/profiles/me/avatar` | Yes | 2 |
| 4 | `PATCH` | `/api/profiles/me/onboarding` | Yes | 5 |
| 5 | `GET` | `/api/workspaces` | Yes | 2 |
| 6 | `GET` | `/api/workspaces/:id` | Yes | 2 |
| 7 | `POST` | `/api/workspaces` | Yes | 2 |
| 8 | `PATCH` | `/api/workspaces/:id` | Yes + Admin/Owner | 2 |
| 9 | `DELETE` | `/api/workspaces/:id` | Yes + Owner | 2 |
| 10 | `GET` | `/api/workspaces/:id/members` | Yes + Member | 2 |
| 11 | `POST` | `/api/workspaces/:id/members` | Yes + Admin | 2 |
| 12 | `PATCH` | `/api/workspaces/:id/members/:userId` | Yes + Admin | 2 |
| 13 | `DELETE` | `/api/workspaces/:id/members/:userId` | Yes + Admin/Owner | 2 |
| 14 | `GET` | `/api/workspaces/:id/channels` | Yes + Member | 3 |
| 15 | `GET` | `/api/workspaces/:id/channels/:channelId` | Yes + Member | 3 |
| 16 | `POST` | `/api/workspaces/:id/channels` | Yes + Admin | 3 |
| 17 | `PATCH` | `/api/workspaces/:id/channels/:channelId` | Yes + Admin | 3 |
| 18 | `DELETE` | `/api/workspaces/:id/channels/:channelId` | Yes + Admin | 3 |
| 19 | `POST` | `/api/workspaces/:id/channels/:channelId/join` | Yes + Member | 3 |
| 20 | `POST` | `/api/workspaces/:id/channels/:channelId/leave` | Yes + Member | 3 |
| 21 | `POST` | `/api/workspaces/:id/channels/:channelId/members` | Yes + Channel Admin | 3 |
| 22 | `DELETE` | `/api/workspaces/:id/channels/:channelId/members/:userId` | Yes + Channel Admin | 3 |
| 23 | `GET` | `/api/messages/:messageId/reactions` | Yes + Member | 4 |
| 24 | `POST` | `/api/messages/:messageId/reactions` | Yes + Member | 4 |

### Modified Existing Endpoints

| # | Method | Route | Change |
|---|---|---|---|
| `GET` | `/api/conversations` | conversations_2 | Add `workspaceId` query param filter for workspace-scoped lists |
| `POST` | `/api/conversations` | conversations_2 | Add `workspaceId` to body for channel-creation context |
| `GET` | `/api/conversations/:id/messages` | messages | Include `reactions` in response |
| `GET` | `/api/me` | auth | Include `profile` data (bio, displayName) |

---

## Demo Scenario — Phase 2

```
1.  User registers for the first time                    ✅
2.  Onboarding wizard guides through setup               ✅
    - Sets profile name, avatar, bio
    - Creates "Acme Corp" workspace
    - Creates #general channel
3.  User sees workspace sidebar with #general            ✅
4.  User sends a message with **bold** and *italic*      ✅
5.  User opens workspace settings, invites user B        ✅
6.  User B receives invite link, joins workspace         ✅
7.  User B joins #general, sees message history          ✅
8.  User B sends a message in #general                   ✅
9.  User A sees it instantly (real-time)                 ✅
10. Admin creates #random (public channel)                ✅
    - User B joins #random
11. Admin creates #leadership (private channel)           ✅
    - Admin adds User A
    - User B cannot see #leadership (403)                ✅
12. User A types — User B sees "User A is typing..."     ✅
13. User B reacts to User A's message with 👍            ✅
14. User A sees reaction appear in real-time             ✅
15. User A edits profile — updates everywhere            ✅
16. User A switches workspaces                            ✅
17. Read receipts and presence work in channels           ✅
18. All integrations pass without errors                  ✅
```
