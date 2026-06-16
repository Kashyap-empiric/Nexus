# Workspaces Module Bug Analysis

Covers server (`server/src/modules/workspaces/`) and client (`client/src/modules/workspaces/`).

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
