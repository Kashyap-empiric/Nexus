# Workspace Member Role Selection — Architecture & Fix

## Overview

The role selection feature allows workspace **Owners** to promote/demote members between three roles: `OWNER`, `ADMIN`, `MEMBER`. This document traces the full flow from the UI to the database and back, and documents a recent fix where the dropdown trigger was not working correctly.

---

## Data Types

### Prisma Schema (`server/prisma/schema.prisma`)
The `WorkspaceRole` enum is defined at the database level:
```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}
```

### Shared Client Type (`client/src/modules/workspaces/types/workspace.ts`)
```ts
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: {
    username: string;
    fullName?: string | null;
    avatarUrl: string | null;
    status?: string;
    statusText?: string | null;
  };
}
```

### Server Validation (`server/src/modules/workspaces/workspaces.schema.ts`)
```ts
export const updateMemberRoleBodySchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});
```

---

## Flow Diagram

```
Client (WorkspaceSettingsModal)
  │
  │  User clicks role badge → DropdownMenuTrigger opens menu
  │  User selects new role → DropdownMenuItem.onClick()
  │
  ▼
useUpdateMemberRole() hook
  │
  │  mutationFn({ workspaceId, userId, role })
  │
  ▼
workspaces.api.ts::updateMemberRole(workspaceId, userId, role)
  │
  │  PATCH /workspaces/{workspaceId}/members/{userId}/role
  │  Body: { role: "ADMIN" | "OWNER" | "MEMBER" }
  │
  ▼
Server Route (workspaces.routes.ts)
  │  router.patch("/:id/members/:userId/role", validate(...), updateMemberRole)
  │
  ▼
Server Controller (workspaces.controller.ts)
  │  Extracts role from req.body
  │  Calls workspacesService.updateMemberRole(workspaceId, memberUserId, role, userId)
  │  Dispatches socket event: dispatchMemberUpdate(...)
  │  Returns updated member
  │
  ▼
Server Service (workspaces.service.ts)
  │  1. Find workspace by slugOrId
  │  2. Verify currentUser is an OWNER of the workspace
  │  3. Verify currentUser is NOT changing their own role
  │  4. Find target member in workspace
  │  5. Call repo: updateWorkspaceMemberRole(workspaceId, memberUserId, role)
  │
  ▼
Server Repository (workspaces.repository.ts)
  │  prisma.workspaceMember.update({
  │    where: { workspaceId_userId: { workspaceId, userId } },
  │    data: { role }
  │  })
  │
  ▼
Database
  │  UPDATE "workspace_members" SET role = ? WHERE workspaceId = ? AND userId = ?
  │
  ▼
Response → Client cache invalidation
  │  useUpdateMemberRole hooks calls:
  │    - queryClient.invalidateQueries(["workspaces", workspaceId])
  │    - queryClient.invalidateQueries(["workspace-members", workspaceId])
  │
  ▼
Socket event → Real-time update
  │  dispatchMemberUpdate emits "MEMBER_UPDATE" to workspace room
  │  workspace.handlers.ts processes ROLE_UPDATED action
  │  Updates member cache with new role
```

---

## Permission Matrix

| Current User Role | Can Change To | Target User Role | Allowed? |
|---|---|---|---|
| OWNER | ADMIN | MEMBER | ✅ |
| OWNER | MEMBER | ADMIN | ✅ |
| OWNER | OWNER (via promotion dialog) | ADMIN/MEMBER | ✅ (with confirmation) |
| OWNER | — | OWNER (self) | ❌ |
| ADMIN | — | anyone | ❌ |
| MEMBER | — | anyone | ❌ |

---

## ❌ The Bug: DropdownMenuTrigger `render` prop

### Symptom
The role selection dropdown in **WorkspaceSettingsModal** was not working — clicking the role badge did not open the dropdown menu.

### Root Cause
The `DropdownMenuTrigger` was using the **`render` prop pattern** (from `@base-ui/react`):

```tsx
{/* ❌ BROKEN — render prop with self-closing trigger */}
<DropdownMenuTrigger
  render={
    <button className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ...", ROLE_BADGE_STYLES[role])}>
      <RoleIcon className="h-3.5 w-3.5" />
      {role}
      <ChevronDown className="h-3 w-3 opacity-60" />
    </button>
  }
/>
```

In `@base-ui/react` v1.5.0's `Menu.Trigger`, the `render` prop did not reliably merge event handlers (onClick, onPointerDown) into the rendered element when the render element already contained children and the trigger was self-closing. This caused the dropdown to never open on click.

### How Other Components Avoided This
The **MemberListPanel** component uses the **children pattern** which works correctly:

```tsx
{/* ✅ WORKING — children pattern */}
<DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1 ...">
  <MoreVertical className="h-3.5 w-3.5" />
</DropdownMenuTrigger>
```

Here, Base UI's `Menu.Trigger` renders its own `<button>` element internally and adds the children inside it, correctly attaching all event handlers.

### The Fix
Changed WorkspaceSettingsModal to use the **children pattern** instead of the `render` prop:

```tsx
{/* ✅ FIXED — children pattern consistent with MemberListPanel */}
<DropdownMenuTrigger className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ...", ROLE_BADGE_STYLES[role])}>
  <RoleIcon className="h-3.5 w-3.5" />
  {role}
  <ChevronDown className="h-3 w-3 opacity-60" />
</DropdownMenuTrigger>
```

### Lesson
For **`Menu.Trigger`** components from `@base-ui/react`, **always use the children pattern** (pass `className` + children directly). The `render` prop pattern should only be used when you need to change the underlying HTML element type (e.g., from `<button>` to `<div>`), and even then, prefer children when possible.

---

## Components Involved

### WorkspaceSettingsModal (`client/src/modules/workspaces/components/WorkspaceSettingsModal.tsx`)
- Full settings dialog with General and Members tabs
- Role dropdown uses `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent`
- Promotes/demotes via `useUpdateMemberRole` hook
- Owner promotion requires confirmation via `AlertDialog`

### MemberListPanel (`client/src/modules/workspaces/components/MemberListPanel.tsx`)
- Side panel member list (workspace and channel views)
- Uses same `useUpdateMemberRole` hook
- Also has "Remove from workspace" functionality
- Uses the children pattern for DropdownMenuTrigger (was already working)

---

## API Endpoint

### `PATCH /workspaces/:id/members/:userId/role`

**Request:**
```json
{
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "data": {
    "workspaceId": "uuid",
    "userId": "uuid",
    "role": "ADMIN",
    "joinedAt": "2026-01-01T00:00:00.000Z",
    "user": { ... }
  }
}
```

**Errors:**
- `403` — "Forbidden: Only workspace owners can manage roles"
- `403` — "Forbidden: Owners cannot change their own role"
- `404` — "Workspace not found" / "Member not found in this workspace"
