# Workspace, Channel Settings & About Page — Implementation Plan

> **Context:** This document serves as a phase-wise technical specification for implementing Workspace Settings, Channel Settings, and an About Page in the Nexus application. It is designed to be easily actionable by AI agents or human developers.

## Prerequisites & Schema Context
Based on the Prisma schema (`server/prisma/schema.prisma`), the following updates will be required before building the settings UI to prevent subsequent migrations:

- **Workspace Model**: Add `description String?` (Currently contains `name`, `slug`, `imageUrl`, and `ownerId`).
- **Conversation (Channel) Model**: Add `description String?` (Currently contains `name`, `visibility` (`PUBLIC`, `PRIVATE`), `isPrivate`, `workspaceId`).
- **WorkspaceMember Model**: Contains `role` (`OWNER`, `ADMIN`, `MEMBER`).

---

## Permissions Matrix

Before implementing the UI or backend authorization, adhere to these rules:

| Action | Owner | Admin | Member |
|---|---|---|---|
| Edit workspace | ✅ | ✅ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ |
| Edit channels | ✅ | ✅ | ❌ |
| Delete channels | ✅ | ✅ | ❌ |
| Leave workspace | ✅* | ✅ | ✅ |

*\*Owners cannot leave if they are the last owner, to prevent orphaned workspaces.*

---

## Execution Order (What to Build First)

1. Workspace description field (Prisma migration)
2. Channel description field (Prisma migration)
3. Workspace settings modal
4. Channel settings modal
5. Leave workspace functionality
6. Member management (Slack-style list)
7. About page
8. Workspace deletion

---

## Phase 1: Database & Backend API Readiness 
**Goal:** Run migrations and ensure all REST endpoints exist to support the frontend operations.

### 1.1 Schema Updates
- Add `description String?` to the `Workspace` model.
- Add `description String?` to the `Conversation` model.
- Generate Prisma client and run migration.

### 1.2 Workspace Endpoints (`server/src/controllers/workspace.controller.ts`)
- **Update Workspace:** `PATCH /api/workspaces/:id`
  - *Payload*: `{ name?: string, slug?: string, imageUrl?: string, description?: string }`
  - *Auth*: Verify user is OWNER or ADMIN (`WorkspaceMember` check).
- **Delete Workspace:** `DELETE /api/workspaces/:id`
  - *Auth*: Verify user is OWNER.
- **Leave Workspace:** `POST /api/workspaces/:id/leave`
  - *Auth*: Verify user is not the sole OWNER.
- **Member Management:** 
  - `PATCH /api/workspaces/:id/members/:userId` -> Update role.
  - `DELETE /api/workspaces/:id/members/:userId` -> Remove member.

### 1.3 Channel Endpoints (`server/src/controllers/channel.controller.ts`)
- **Update Channel:** `PATCH /api/channels/:id`
  - *Payload*: `{ name?: string, description?: string, visibility?: ChannelVisibility }`
  - *Auth*: Verify user is Workspace ADMIN/OWNER or Channel Creator.
  - *Rule*: When visibility changes from `PUBLIC` to `PRIVATE`, keep existing members but restrict future access.
- **Delete Channel:** `DELETE /api/channels/:id`
  - *Auth*: Verify user is Workspace ADMIN/OWNER.

---

## Phase 2: Frontend API Integration
**Goal:** Expose the backend endpoints to the React frontend using React Query / Axios.

### 2.1 Workspace API (`client/src/modules/workspaces/api/`)
- Add `useUpdateWorkspaceMutation` hook.
- Add `useDeleteWorkspaceMutation` hook.
- Add `useLeaveWorkspaceMutation` hook.
- Add `useUpdateWorkspaceMemberRoleMutation` hook.
- Add `useRemoveWorkspaceMemberMutation` hook.

### 2.2 Channel API (`client/src/modules/conversations/api/`)
- Add `useUpdateChannelMutation` hook.
- Add `useDeleteChannelMutation` hook.

---

## Phase 3: Workspace Settings UI
**Goal:** Build the interface for workspace management.

### 3.1 Settings Modal Layout
- Create a tabbed interface accessible from the main Workspace dropdown.

### 3.2 General Tab
- **Inputs**: Workspace Icon upload, Workspace Name, Workspace Slug, Workspace Description.
- **Action**: Save button (triggers `useUpdateWorkspaceMutation`).

### 3.3 Members Tab
- **UI**: A Slack-style member list (Avatar, Name, Email). No dense admin data tables.
- **Actions**: Role dropdown and Remove button (only visible/enabled for Admins/Owners).
- **Self Actions**: "Leave Workspace" button available for everyone.

### 3.4 Danger Zone Tab (Role-gated)
- **UI**: Red outlined section.
- **Action**: "Delete Workspace" button (Only for Owners).
- **Confirmation**: Audit-friendly confirmation requiring the user to type the exact workspace name.

---

## Phase 4: Channel Settings UI
**Goal:** Build the interface for channel management.

### 4.1 Entry Points
- **Channel Header**: Next to the channel name (e.g. `# general [Settings]`).
- **Context Menu**: Right-click menu on the channel list (`Rename`, `Settings`, `Delete`).

### 4.2 Settings Modal
- **General Tab**: Input for Channel Name, Description, and Toggle for Public/Private (`visibility`).
- **Danger Zone Tab**: Delete channel button.
- **Confirmation**: Audit-friendly confirmation requiring typing the exact channel name to delete.

---

## Phase 5: About Page UI
**Goal:** Add static information and diagnostic page about the Nexus application.

### 5.1 Route & Component
- Integrate into the existing user Settings modal as a new tab.

### 5.2 Content
- **App Details**: Logo, Version, Credits, Links.
- **Diagnostic Info**: (Especially useful in development)
  - Environment (Development / Production)
  - Build Date
  - Backend Status (e.g., Connected/Disconnected)
  - WebSocket Status
