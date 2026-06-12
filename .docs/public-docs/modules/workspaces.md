# Workspaces Module

## Overview

The Workspaces module provides team collaboration spaces with channels, member management, and role-based access control. Workspaces are the organizational unit that contains channels (which reuse the existing `Conversation` model with `type: CHANNEL`).

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
    CreateChannelModal.tsx     — Create channel dialog
    WorkspaceHeader.tsx        — Workspace name + dropdown
  types/
    workspace.ts               — Workspace, WorkspaceMember interfaces
  index.ts                     — Barrel exports
```

## Server-Side (`server/src/modules/workspaces`)

### Endpoints

| Method | Route | Auth | Description | Notes |
|--------|-------|------|-------------|-------|
| `GET` | `/workspaces` | Yes | List user's workspaces | |
| `POST` | `/workspaces` | Yes | Create workspace | Auto-creates #general channel |
| `GET` | `/workspaces/:id` | Yes + Member | Workspace details | Includes members + channels |
| `GET` | `/workspaces/:id/channels` | Yes + Member | List channels | |
| `POST` | `/workspaces/:id/channels` | Yes + Member | Create channel | All members auto-joined to public channels |

### Files

| File | Role |
|------|------|
| `workspaces.routes.ts` | Route definitions |
| `workspaces.controller.ts` | HTTP handlers + socket dispatch |
| `workspaces.service.ts` | Business logic |
| `workspaces.repository.ts` | Prisma queries |
| `workspaces.schema.ts` | Zod validation schemas |

### Key Logic

- **Workspace Creation:** Creates the workspace record, adds the creator as OWNER, and creates a #general channel in a single `runTransaction`.
- **Channel Creation:** Creates a `Conversation` with `type: CHANNEL` and adds all workspace members as `ConversationMember` records (for public channels). Uses `findWorkspaceByIdOrSlug()` to resolve either UUID or slug.
- **Membership Check:** Uses `checkConversationAccess()` which allows workspace members to access non-private channels without explicit `ConversationMember` records.

## Client-Side

### Hooks

| Hook | Description |
|------|-------------|
| `useWorkspaces()` | Fetches all workspaces for the current user |
| `useWorkspaceDetails(slugOrId)` | Fetches single workspace with members + channels |
| `useCreateWorkspace()` | Creates workspace with auto-navigation |
| `useCreateChannel()` | Creates channel with auto-navigation |
| `useWorkspaceChannelsQuery(workspaceId)` | Polls channels every 5s |

### Navigation Flow

1. User clicks workspace icon in NavigationRail
2. `ChatStore.mode` set to `"WORKSPACE"`, `activeWorkspaceId` set to workspace slug
3. Sidebar switches to workspace mode → shows WorkspaceHeader + channels list
4. Channel click → navigates to `/workspaces/{slug}/channels/{channelId}`
5. ActiveConversation renders the channel with `MessageList` + `MessageInput`

### Known Issues

- Channel read receipts not working (no `partnerLastReadMessageId` for channels)
- No workspace member list UI in sidebar
- Channels are flat-listed without public/private separation
- CreateChannelModal redirects to `/conversations/{channelId}` instead of workspace channel URL
- Channel list polls every 5s instead of using socket events for real-time updates

### Future Enhancements

- Workspace settings (rename, change image, manage members)
- Role management UI in sidebar (promote/demote)
- Private channel member management
- Workspace-level invite generation
