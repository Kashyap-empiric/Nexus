# Nexus — Phase 2 Plan: Workspaces, Channels & Collaboration

> **Status:** Active Development — `feat/workspaces` branch
> **Last Updated:** 2026-06-12
>
> Some Phase 2 features have been implemented. This document reflects current status.
> For the prioritized list of remaining work, see `PLAN.md` at the project root.

---

## ✅ Implemented (on `feat/workspaces`)

### Server — Workspace Module (`server/src/modules/workspaces/`)

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `GET /api/workspaces` | GET | ✅ | List user's workspaces |
| `GET /api/workspaces/:id` | GET | ✅ | Workspace details with members + channels |
| `POST /api/workspaces` | POST | ✅ | Create workspace (creator becomes OWNER, auto-creates #general) |
| `GET /api/workspaces/:id/channels` | GET | ✅ | List channels in workspace |
| `POST /api/workspaces/:id/channels` | POST | ✅ | Create channel (all members auto-joined to public channels) |

### Prisma Schema

| Model | Status | Notes |
|---|---|---|
| `Workspace` | ✅ | Full implementation with slug, ownerId |
| `WorkspaceMember` | ✅ | Role-based (OWNER, ADMIN, MEMBER) |
| `Conversation` extensions | ✅ | workspaceId FK, type CHANNEL support |

### Client — Workspace UI

| Component | Status | Notes |
|---|---|---|
| `NavigationRail.tsx` | ✅ | Workspace icons, create workspace button, DM icon |
| `WorkspaceHeader.tsx` | ✅ | Workspace name dropdown with invite option |
| `CreateWorkspaceModal.tsx` | ✅ | Name only, auto-generates slug |
| `CreateChannelModal.tsx` | ✅ | Name input, creates public channel |
| `Sidebar.tsx` | ✅ | Workspace mode shows channels, DM mode shows conversations |
| `ActiveConversation.tsx` | ✅ | Displays both DMs and channels |
| Channel routing | ✅ | `/workspaces/{slug}/channels/{channelId}` |
| `useWorkspaceChannels.ts` | ✅ | Polls every 5s for channel updates |

### Workspace Routing

```
NavigationRail: switches between DM and WORKSPACE mode
Sidebar: shows channels in WORKSPACE mode, conversations in DM mode
Channel page: /workspaces/{slug}/channels/{channelId}
Conversation page: /conversations/{id}
```

---

## 🔴 Still to Implement (see PLAN.md for details)

| Feature | Priority | Notes |
|---------|----------|-------|
| Message read receipts for channels | High | `partnerLastReadMessageId` is undefined for channels |
| Member list (Discord-style) | High | Show online/offline members in sidebar |
| In-app notification system | High | Bell icon + inbox page |
| Channel split (public/private) | Medium | Sidebar separation by `isPrivate` |
| CreateChannelModal → redirect fix | Low | Currently redirects to `/conversations/` instead of workspace URL |
| Optimistic channel creation | Low | Currently poll-based (5s interval) — should use socket events |
| Non-transactional reads in editMessage | Medium | Pre-existing debt |
| Horizontal scaling (Redis Pub/Sub) | Low | Pre-existing debt |

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
