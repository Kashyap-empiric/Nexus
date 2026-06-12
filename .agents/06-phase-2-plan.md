# Nexus — Phase 2 Plan: Workspaces, Channels & Collaboration

> **Status:** ✅ **Phase 2 Workspaces Complete** — `feat/workspaces` branch ready for merge
> **Last Updated:** 2026-06-12
>
> All workspace and channel features are implemented. Remaining work is documented below.
> For the prioritized list, see `README.md` or `PLAN.md` at the project root.

---

## ✅ Implemented (on `feat/workspaces`)

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
| `Notification` | 🟡 | DB table exists (from migration); server endpoints not built |
| `PushSubscription` | 🟡 | DB table exists (from migration); not implemented |

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
| Channel routing | ✅ | `/workspaces/{slug}/channels/{channelId}` |

### Socket Events Added

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `channel:update` | S → C | `{ action, channel, userId? }` | Channel created/renamed/deleted |
| `member:update` | S → C | `{ action, userId, role }` | Workspace role changed |
| `workspace:update` | S → C | `{ action, workspace }` | Workspace metadata changed |
| `workspace:join` | C → S | `{ workspaceId }` | Join workspace room on switch |

### Security Fixes (beyond original plan)

| Fix | Details |
|---|---|
| Private channel socket room leak | `findWorkspaceChannelsByUserId` now filters private channels by explicit membership |
| Same leak in `workspace:join` handler | `findChannelIdsByWorkspaceId` accepts optional `userId` for private channel filtering |
| Socket events silently lost | Workspace rooms (`workspace:{id}`) now joined on connect in `socket.ts` |
| `verifyWorkspaceMember` duplication | Delegated to existing `isWorkspaceMember` instead of duplicating Prisma query |

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
```

---

## 🟡 Open Items (Post-Phase 2)

| Feature | Priority | Notes |
|---------|----------|-------|
| Message read receipts for channels | Medium | `partnerLastReadMessageId` is undefined for channels |
| In-app notification system | Medium | DB schema + migration exist; server endpoints not yet built; client UI exists |
| Optimistic channel creation | Low | Currently poll-based (5s interval) — should use socket events |
| Non-transactional reads in editMessage | Medium | Pre-existing debt |
| Horizontal scaling (Redis Pub/Sub) | Low | Pre-existing debt |
| editMessage stale `updatedAt` | Low | Editing a message doesn't bump sidebar position |

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
