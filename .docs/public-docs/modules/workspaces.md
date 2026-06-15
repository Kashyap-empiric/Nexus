# Workspaces Module

## Overview

The Workspaces module provides team collaboration spaces with channels, member management, role-based access control, and notification integration. Workspaces are the organizational unit that contains channels (which reuse the existing `Conversation` model with `type: CHANNEL`).

## Architecture

```
workspaces/
  api/
    workspaces.api.ts          — REST API calls
  hooks/
    useWorkspaces.ts           — TanStack Query hooks (list, details, create)
    useWorkspaceChannels.ts    — Channel query hook
  components/
    CreateWorkspaceModal.tsx   — Create workspace dialog
    CreateChannelModal.tsx     — Create channel dialog with public/private toggle
    WorkspaceHeader.tsx        — Workspace name + dropdown
    WorkspaceChannelItem.tsx   — Channel context menu (rename, delete)
    MemberListPanel.tsx        — Right-side member list with presence + role badges
  types/
    workspace.ts               — Workspace, WorkspaceMember interfaces
  index.ts                     — Barrel exports
```

## Server-Side (`server/src/modules/workspaces`)

### Endpoints

| Method | Route | Auth | Description | Notes |
|--------|-------|------|-------------|-------|
| `GET` | `/workspaces` | Yes | List user's workspaces with unread counts | |
| `POST` | `/workspaces` | Yes | Create workspace | Auto-creates #general channel |
| `GET` | `/workspaces/:id` | Yes + Member | Workspace details | Includes members + channels |
| `GET` | `/workspaces/:id/channels` | Yes + Member | List channels with unread counts | |
| `POST` | `/workspaces/:id/channels` | Yes + Member | Create channel | All members auto-joined to public channels; creates CHANNEL_CREATED notifications |
| `PATCH` | `/workspaces/:id/channels/:channelId` | Yes + Member | Update channel name/visibility | Dispatches CHANNEL_UPDATE socket event |
| `DELETE` | `/workspaces/:id/channels/:channelId` | Yes + Admin | Delete channel | #general protected from deletion |
| `GET` | `/workspaces/:id/members` | Yes + Member | List workspace members | |
| `PATCH` | `/workspaces/:id/members/:userId/role` | Yes + Owner | Update member role | Dispatches MEMBER_UPDATE socket event |
| `DELETE` | `/workspaces/:id/members/:userId` | Yes + Admin | Remove member | Creates MEMBER_REMOVED notification |
| `POST` | `/workspaces/:id/invite` | Yes + Member | Invite single user by username or email | Creates INVITE_RECEIVED notification |
| `POST` | `/workspaces/:id/invite-multiple` | Yes + Member | Batch invite multiple users by userIds | Max 50 per request |

### Files

| File | Role |
|------|------|
| `workspaces.routes.ts` | Route definitions |
| `workspaces.controller.ts` | HTTP handlers + socket dispatch + notification creation |
| `workspaces.service.ts` | Business logic |
| `workspaces.repository.ts` | Prisma queries |
| `workspaces.schema.ts` | Zod validation schemas |
| `workspaces.types.ts` | TypeScript interfaces |

### Key Logic

- **Workspace Creation:** Creates workspace, adds creator as OWNER, creates #general channel in a single `runTransaction`.
- **Channel Creation:** Creates `Conversation` with `type: CHANNEL` and adds all workspace members for public channels (or only creator for private).
- **Channel Update/Delete:** Validates permissions (OWNER/ADMIN for delete), protects #general.
- **Member Removal:** Validates permissions; cannot remove OWNER or self. Creates MEMBER_REMOVED notification.
- **Batch Invite:** Accepts userIds array, generates invite tokens per user, creates INVITE_RECEIVED notifications. Returns invited/skipped arrays.
- **Unread Counting:** Aggregate unread counts per workspace across all accessible channels.

### Notification Integration

The workspaces controller creates notifications for:
- **CHANNEL_CREATED**: When a new channel is created (sent to all members except creator)
- **INVITE_RECEIVED**: When a user is invited (via invite or batch invite endpoints)
- **MEMBER_REMOVED**: When a member is removed from the workspace

### Socket Events Dispatched

| Event | When | Payload |
|-------|------|---------|
| `channel:update` | Channel created/updated/deleted | `{ action, channel, userId? }` |
| `member:update` | Member role changed/removed | `{ action, member }` |
| `workspace:update` | Workspace metadata changed | `{ action, workspace }` |

## Client-Side

### Hooks

| Hook | Description |
|------|-------------|
| `useWorkspaces()` | Fetches all workspaces for the current user with unread counts |
| `useWorkspaceDetails(slugOrId)` | Fetches single workspace with members + channels |
| `useCreateWorkspace()` | Creates workspace with auto-navigation |
| `useCreateChannel()` | Creates channel with public/private toggle and auto-navigation |
| `useWorkspaceChannelsQuery(workspaceId)` | Polls channels every 5s |

### Navigation Flow

1. User clicks workspace icon in NavigationRail
2. `ChatStore.mode` set to `"WORKSPACE"`, `activeWorkspaceId` set to workspace slug
3. Sidebar switches to workspace mode → shows WorkspaceHeader + channels list (public/private separated)
4. Channel click → navigates to `/workspaces/{slug}/channels/{channelId}`
5. ActiveConversation renders the channel with `MessageList` + `MessageInput`
6. Right-side InfoPanel shows Members tab via MemberListPanel

### Known Issues

- Channel read receipts not working (no `partnerLastReadMessageId` for channels)
- CreateChannelModal redirects to `/conversations/{channelId}` instead of workspace channel URL
- Channel list polls every 5s instead of using socket events for real-time updates
