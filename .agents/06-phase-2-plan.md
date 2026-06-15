# Nexus — Phase 2 Plan: Workspaces, Channels & Collaboration

> **Status:** ✅ **Phase 2 Workspaces Complete + Notifications Complete**
> **Last Updated:** 2026-06-15
>
> Workspaces, channels, in-app notifications, push notifications, user profiles, and settings are all implemented.
> Active branch: `feat/notification`

---

## ✅ Implemented (Workspaces + Notifications)

### Server — Workspace Module (`server/src/modules/workspaces/`)

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `GET /api/workspaces` | GET | ✅ | List user's workspaces |
| `GET /api/workspaces/:id` | GET | ✅ | Workspace details with members + channels |
| `POST /api/workspaces` | POST | ✅ | Create workspace (creator becomes OWNER, auto-creates #general) |
| `GET /api/workspaces/:id/members` | GET | ✅ | List workspace members |
| `GET /api/workspaces/:id/channels` | GET | ✅ | List channels in workspace |
| `POST /api/workspaces/:id/channels` | POST | ✅ | Create channel (supports `visibility: PUBLIC | PRIVATE`) |
| `PATCH /api/workspaces/:id/channels/:channelId` | PATCH | ✅ | Rename channel |
| `DELETE /api/workspaces/:id/channels/:channelId` | DELETE | ✅ | Delete channel (OWNER/ADMIN only, #general protected) |
| `PATCH /api/workspaces/:id/members/:userId/role` | PATCH | ✅ | Promote/demote member role |

### Prisma Schema

| Model | Status | Notes |
|---|---|---|
| `Workspace` | ✅ | Full implementation with slug, ownerId |
| `WorkspaceMember` | ✅ | Role-based (OWNER, ADMIN, MEMBER) |
| `Conversation` extensions | ✅ | workspaceId FK, `createdBy`, `visibility` (ChannelVisibility enum) |
| `Notification` | ✅ | Full implementation: controller, service, repository, routes, schema |
| `PushSubscription` | ✅ | Full implementation with VAPID push, subscription management |

### Client — Workspace UI

| Component | Status | Notes |
|---|---|---|
| `NavigationRail.tsx` | ✅ | Workspace icons, create workspace button, DM icon |
| `WorkspaceHeader.tsx` | ✅ | Workspace name dropdown with invite option |
| `CreateWorkspaceModal.tsx` | ✅ | Name only, auto-generates slug |
| `CreateChannelModal.tsx` | ✅ | Public/Private toggle |
| `Sidebar.tsx` | ✅ | Channels split into public/private sections, DM conversations in DM mode |
| `ActiveConversation.tsx` | ✅ | Displays both DMs and channels, member panel |
| `WorkspaceChannelItem.tsx` | ✅ | Channel context menu (rename, delete) |
| `MemberListPanel.tsx` | ✅ | Discord-style member list with presence + role badges |
| `InfoPanel.tsx` | ✅ | Conversation details: About, Members, Pins tabs |
| Channel routing | ✅ | `/workspaces/{slug}/channels/{channelId}` |

### Client — Notifications & Settings UI

| Component | Status | Notes |
|---|---|---|
| `BellPopover.tsx` | ✅ | Bell icon with unread badge, recent activity dropdown |
| `NotificationSettings.tsx` | ✅ | Push toggle, DM/mention/channel toggles |
| `ProfileSettings.tsx` | ✅ | Username, display name, avatar URL editing |
| `AppearanceSettings.tsx` | ✅ | Theme toggle (light/dark/system) |
| `SharedSettingsModal.tsx` | ✅ | Tabbed modal for all settings views |
| Notifications page | ✅ | `/notifications` route with infinite scroll |

### Socket Events Added

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `channel:update` | S → C | `{ action, channel, userId? }` | Channel created/renamed/deleted |
| `member:update` | S → C | `{ action, userId, role }` | Workspace role changed |
| `workspace:update` | S → C | `{ action, workspace }` | Workspace metadata changed |
| `workspace:join` | C → S | `{ workspaceId }` | Join workspace room on switch |
| `notification:new` | S → C | Full Notification object | Real-time notification delivery |

### Notification Flows Implemented

| Trigger | Notification Type | Push |
|---|---|---|
| Workspace invite sent | `INVITE_RECEIVED` | ✅ |
| Invite accepted | `INVITE_ACCEPTED` | ✅ |
| Channel created | `CHANNEL_CREATED` | ✅ |
| Member removed from workspace | `MEMBER_REMOVED` | ✅ |

### API Endpoints Added

| Module | Endpoints |
|---|---|
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Push | `POST /notifications/push/subscribe`, `DELETE /notifications/push/subscribe` |
| Preferences | `GET /notifications/preferences`, `PUT /notifications/preferences` |
| Users (Profile) | `GET /users/me`, `PATCH /users/me` |
| Invites (Batch) | `POST /workspaces/:id/invite-multiple` |

### Security Fixes (beyond original plan)

| Fix | Details |
|---|---|
| Private channel socket room leak | `findWorkspaceChannelsByUserId` filters private channels by explicit membership |
| Same leak in `workspace:join` handler | `findChannelIdsByWorkspaceId` accepts optional `userId` for private channel filtering |
| Socket events silently lost | Workspace rooms now joined on connect |
| `verifyWorkspaceMember` duplication | Delegated to existing `isWorkspaceMember` |
| Push subscription hijacking | Endpoint reassignment to different user prevented via deleteMany |
| Push notification URL normalization | Relative URLs converted to absolute for SW matching |
| Push toggle race condition | Sequential subscribe/unsubscribe flow |

### Backward Compatibility

- **ConversationMember PK**: Uses `@id` (simple PK) + `@@unique([conversationId, userId])` to match the production schema — avoids destructive migration
- **Migration**: Purely additive SQL with `IF NOT EXISTS` and PL/pgSQL exception handling
- **Migration applied** to dev database via `prisma migrate deploy`
- **Safe to deploy while main runs** — main's Prisma client ignores unknown columns/tables

### Workspace Routing

```
NavigationRail: switches between DM and WORKSPACE mode
Sidebar: shows channels in WORKSPACE mode, conversations in DM mode
Channel page: /workspaces/{slug}/channels/{channelId}
Conversation page: /conversations/{id}
Settings: /settings → SharedSettingsModal
Notifications: /notifications
```

---

## 🟡 Open Items (Post-Notifications)

| Feature | Priority | Notes |
|---------|----------|-------|
| Message read receipts for channels | Medium | `partnerLastReadMessageId` is undefined for channels |
| Optimistic channel creation | Low | Currently poll-based (5s interval) — should use socket events |
| Non-transactional reads in editMessage | Medium | Pre-existing debt |
| Horizontal scaling (Redis Pub/Sub) | Low | Pre-existing debt |
| editMessage stale `updatedAt` | Low | Editing a message doesn't bump sidebar position |
| Reactions (emoji) | Medium | Planned feature — no model or endpoints yet |
| Mentions (@user) | Medium | Planned feature — no mention detection yet |
| Pin messages | Low | Planned feature — no pinning yet |
| File uploads | Low | Planned feature — no file storage yet |

---

## 🚧 Future/Planned Features (Not Yet Started)

### Typing Indicators

**Status:** Socket event constants exist (`TYPING_START`, `TYPING_STOP`) but no implementation.

- Server throttles re-broadcast to every 3s for `typing:start`, auto-sends `typing:stop` after 5s of inactivity
- Client emits on input change (throttled 2s), emits `typing:stop` on send/blur/clear
- UI: Show "Alice is typing..." or "Alice, Bob are typing..." below the conversation header

### Emoji Reactions

**Status:** `Reaction` table exists in the Prisma schema (not yet migrated), no endpoints or UI.

- Toggle semantics: lookup → delete (if exists) or create (if not)
- Socket events: `reaction:added` / `reaction:removed`
- UI: ReactionBar inline below messages, emoji picker popover on hover

### Rich Text Formatting

**Status:** Not started. Messages are stored as plain text.

- Client-side markdown rendering via `react-markdown` + `remark-gfm`
- Support: bold, italic, strikethrough, code blocks/inline, bullet/numbered lists, blockquotes
- Preview mode toggle in MessageInput

### Onboarding Flow

**Status:** Not started. New users land on an empty `/conversations` page.

- Multi-step wizard: welcome → profile setup → create first workspace → invite members → channel setup → guided tour
- Persisted via user metadata so it only shows once

### File Sharing

**Status:** Not started. Text-only messages.

- Drag & drop + file picker for uploads
- Image preview, file type icons, progress indicators

### Global Search

**Status:** Not started. Sidebar search filters conversation list only.

- Cmd+K / Ctrl+K command palette
- Search across workspaces, channels, users, and message content

---

## Architecture Decisions

1. **Channels reuse the Conversation model** — `type: CHANNEL` + `workspaceId` FK. All existing message infrastructure (send, edit, delete, read receipts, real-time) works without modification for basic messaging.
2. **Slug-based routing** — Workspace routes use `slug` instead of UUID for human-readable URLs: `/workspaces/{slug}/channels/{channelId}`.
3. **Auto-join on channel creation** — When a new public channel is created, all workspace members are automatically added as `ConversationMember` records.
4. **Channel access control** — Uses `checkConversationAccess` in `auth.repository.ts` to allow workspace members to access non-private channels.
