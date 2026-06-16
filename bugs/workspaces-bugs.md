# Workspaces Module Bug Analysis

Covers server (`server/src/modules/workspaces/`) and client (`client/src/modules/workspaces/`).

---

## CRITICAL BUGS

### 1. No Zod Validation on ANY Workspace Routes (11 Routes)

**File:** `server/src/modules/workspaces/workspaces.routes.ts:1-38`

Every workspace route handler destructures `req.body` and `req.params` without Zod validation:

| Route | Method | Unvalidated Fields |
|-------|--------|-------------------|
| `/workspaces` | GET | (none — params) |
| `/workspaces` | POST | `name`, `slug`, `imageUrl` |
| `/workspaces/:id` | GET | `:id` |
| `/workspaces/:id/channels` | GET | `:id` |
| `/workspaces/:id/channels` | POST | `:id`, `name`, `visibility` |
| `/workspaces/:id/channels/:channelId` | PATCH | `:id`, `:channelId`, `name`, `visibility` |
| `/workspaces/:id/channels/:channelId` | DELETE | `:id`, `:channelId` |
| `/workspaces/:id/members` | GET | `:id` |
| `/workspaces/:id/invite` | POST | `:id`, `username`, `email` |
| `/workspaces/:id/invite-multiple` | POST | `:id`, `userIds[]` |
| `/workspaces/:id/members/:userId` | PATCH | `:id`, `:userId`, `role` |
| `/workspaces/:id/members/:userId` | DELETE | `:id`, `:userId` |

**All 11 routes** are completely unprotected from malformed input. Compare with `messages.routes.ts` and `users.routes.ts` which consistently use `validate()` middleware.

This means:
- `name` could be empty, 10000 chars, contain control characters
- `slug` validity is only checked inside `createWorkspace` service (after DB work begins)
- `visibility` could be any string, not just `"PUBLIC"` / `"PRIVATE"` — Prisma throws a 500
- `userIds[]` in batch invite is only checked for `Array.isArray` — could contain invalid UUIDs
- Route params like `:id`, `:channelId`, `:userId` are never verified as valid UUIDs
- `role` in `updateMemberRole` is typed as `WorkspaceRole` but could be any string at runtime

### 2. Channel Name Can Be Changed by Any Workspace Member

**File:** `server/src/modules/workspaces/workspaces.service.ts:149-174`

```typescript
export const updateChannel = async (..., data: { name?: string; visibility?: ... }, userId: string) => {
  // ...
  if (member.role !== OWNER && member.role !== ADMIN) {
    // Only check visibility changes
    if (data.visibility) throw new Error("Forbidden...");
  }
  // name changes have NO role check
};
```

The permission check at line 159 only guards `visibility` changes. Name changes (line 156: `"Any workspace member can update a channel name"`) have **zero authorization**. Any workspace member, regardless of role, can rename any channel — including `#general`.

**Impact:** A disgruntled member could rename `#general` to `#we-got-hacked`, rename project channels to offensive names, or cause confusion by renaming channels arbitrarily.

**Fix:** Add a role check for name changes, at minimum requiring ADMIN or OWNER.

---

## MEDIUM BUGS

### 1. `createWorkspace` Has No Request Body Validation

**File:** `server/src/modules/workspaces/workspaces.controller.ts:57-68`

The controller reads `name`, `slug`, and `imageUrl` from `req.body` but there's no Zod validation on any of these fields:
- `name` could be empty, 1000 chars, contain special characters
- `slug` validity is checked in the service (`/^[a-z0-9-]+$/`) but only after the request starts processing
- `imageUrl` could be any string

The `workspaces.routes.ts` has no `validate()` middleware on the POST `/` route. If invalid data passes the express body parser, the service throws with a generic 500.

### 2. `createChannel` for Public Channels Creates Massive Member Arrays

**File:** `server/src/modules/workspaces/workspaces.service.ts:131-133`

```typescript
const memberUserIds = visibility === "PUBLIC"
  ? workspace.members.map((m) => ({ userId: m.userId }))
  : [{ userId }];
```

For a workspace with 10,000 members, creating a public channel generates a Prisma query with 10,000 `conversationMember.create` entries. This can:
- Hit Prisma's query size limits
- Take seconds to execute, blocking the request
- Generate massive socket dispatches

The `findWorkspaceByIdOrSlug` already loads all members eagerly (`include: { members: ... }`) even when only their IDs are needed. For large workspaces, this loads the entire member table into memory on every channel creation.

### 3. `updateChannel` Uses `any` Type for Update Data

**File:** `server/src/modules/workspaces/workspaces.service.ts:166`

```typescript
const updateData: any = {};
```

This bypasses TypeScript safety. If new fields are added to the `conversation` model update schema, there's no compile-time check that they're properly mapped from the route body.

### 4. `createWorkspace` Route Has No Rate Limiter

**File:** `server/src/modules/workspaces/workspaces.routes.ts:23`

`POST /workspaces/` creates a workspace via a transaction with multiple Prisma writes and a new "general" channel — no rate limiting. A user could create thousands of workspaces.

### 5. `removeWorkspaceMember` Doesn't Revoke Outstanding Invites

**File:** `server/src/modules/workspaces/workspaces.repository.ts:177-199`

(Also documented in `invites-bugs.md` Bug 14.)

The function removes the user from all workspace channels and deletes the `WorkspaceMember` record, but does **not** call `revokeAllInvitesForEntity`. Old invite tokens for the workspace remain valid. A removed user could re-join via their saved invite link.

### 6. `getWorkspaceMembers` Loads All Member Data on Every Request

**File:** `server/src/modules/workspaces/workspaces.service.ts:197-205`

Calls `findWorkspaceByIdOrSlug` which loads all channels and members with full user data, then returns only the members. Channels are loaded but never used.

### 7. `onboardUserToWorkspaceInTransaction` Silently Swallows P2002 Errors

**File:** `server/src/modules/workspaces/workspaces.repository.ts:107-150`

(Also documented in `invites-bugs.md` Bug 3.)

The single try-catch wrapping both `workspaceMember.create` and `conversationMember.create` means if the first succeeds and the second fails with `P2002`, the error is silently swallowed. The user ends up as a workspace member but NOT in the general channel — an inconsistent state.

---

## MINOR BUGS

### 8. `findWorkspaceByIdOrSlug` Is Used for Both Lookup and Authorization

**File:** `server/src/modules/workspaces/workspaces.repository.ts:19-31`

This function loads channels and members eagerly. Most callers only need a subset. Systemic over-fetching.

### 9. `inviteMembers` Handler Doesn't Verify Input User IDs Exist

**File:** `server/src/modules/workspaces/workspaces.controller.ts:269-336`

(Also documented in `invites-bugs.md` Bug 13.)

### 10. `updateChannel` Route Doesn't Validate Request Body

**File:** `server/src/modules/workspaces/workspaces.routes.ts:27`

`PATCH /:id/channels/:channelId` has no `validate()` middleware.

### 11. `deleteChannel` Route Doesn't Validate Params

**File:** `server/src/modules/workspaces/workspaces.routes.ts:28`

Both `:id` and `:channelId` are unvalidated UUIDs.

### 12. No Input Validation on `updateMemberRole`

**File:** `server/src/modules/workspaces/workspaces.routes.ts:32`

The `role` body field is typed as `WorkspaceRole` but not validated with Zod.

### 13. `dispatchConversationNew` in `createChannel` Casts to `any`

**File:** `server/src/modules/workspaces/workspaces.controller.ts:79`

```typescript
dispatchConversationNew(channel as any);
```

The `as any` cast silences type mismatches. If the channel object lacks expected `members` structure, the socket payload is broken.

### 14. `sendWorkspaceInvite` Doesn't Validate Inviter Has Permission to Invite

**File:** `server/src/modules/workspaces/workspaces.controller.ts:169-201`

The `sendWorkspaceInvite` helper is called from `inviteMemberByUsername` and `inviteMembers` — but neither checks the inviter's role. Any workspace member can invite, regardless of role. The invites module notes this as a design observation.

### 15. `removeWorkspaceMember` Doesn't Dispatch Socket Event to Removed User's Other Sessions

**File:** `server/src/modules/workspaces/workspaces.controller.ts:377-418`

The `dispatchMemberUpdate` emits to the workspace room. But if the removed user has multiple sessions, only one gets the direct `user:` room notification. Their other sessions won't know they were removed until they attempt an action and hit the 403.

### 16. `createChannel` Calls `getWorkspaceDetails` Twice — Redundant DB Query

**File:** `server/src/modules/workspaces/workspaces.controller.ts:70-119, 84`

```typescript
const channel = await workspacesService.createChannel(workspaceId, name, visibility, userId);
// ...
const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);  // ← second query
```

`createChannel` at line 76 calls `workspacesService.createChannel` which internally calls `findWorkspaceByIdOrSlug` (a DB query). Then on line 84, the controller calls `getWorkspaceDetails` which ALSO calls `findWorkspaceByIdOrSlug` — the second query is completely redundant. The workspace object already exists in the first call's scope but is never returned.

**Fix:** Return the workspace from `createChannel` or pass it from the controller.

### 17. `removeMember` Prevents Self-Removal But Has No "Leave Workspace" Alternative

**File:** `server/src/modules/workspaces/workspaces.service.ts:234`

```typescript
if (memberUserId === userId) {
  throw new Error("Forbidden: Cannot remove yourself from the workspace");
}
```

There is no "Leave workspace" API endpoint. A user who wants to leave a workspace must ask an admin to remove them. The check at line 234 is correct for the removal endpoint, but there's no independent `leaveWorkspace` endpoint.

### 18. `createWorkspace` Doesn't Check Slug Uniqueness Before Transaction

**File:** `server/src/modules/workspaces/workspaces.service.ts:80-115`

`createWorkspace` starts a Prisma transaction and tries to create the workspace. If the slug already exists, the transaction fails with a `P2002` unique constraint violation, and the entire transaction rolls back. The user gets a generic 500 error.

**Better approach:** Check slug existence before starting the transaction (like `onboarding.service.ts` does), and return a user-friendly error like "This workspace URL is already taken."

### 19. `workspace.members.some((m: any)` Uses `any` Type in Controller

**File:** `server/src/modules/workspaces/workspaces.controller.ts:234, 301`

```typescript
const isAlreadyMember = workspace.members.some((m: any) => m.userId === targetUser.id);
```

The `as any` pattern appears in multiple places (line 234, 250, 288, 301). This bypasses TypeScript's type checking — if the `WorkspaceDetails` response shape changes (e.g., members is renamed to `memberships`), these lines silently break with a runtime error.
