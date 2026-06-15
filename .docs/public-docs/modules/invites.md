# Invites Module — End-to-End Documentation

## Overview

The invites module handles all invitation flows across the application: workspace invitations, conversation invitations, user-to-user DMs, and channel invitations. The system uses a **token-based invite model** where each invite generates a cryptographically secure token that can be resolved to add the recipient to the target entity.

---

## Data Model

### Invite Table

```prisma
model Invite {
  id         String     @id @default(cuid())
  entityId   String     // ID of the target entity (workspace, conversation, user)
  token      String     @unique  // Cryptographically secure random token
  createdBy  String     // User ID of the inviter
  expiresAt  DateTime?  // 7-day expiration by default
  maxUses    Int?       // Null = unlimited uses
  usedCount  Int        @default(0)
  revoked    Boolean    @default(false)
  createdAt  DateTime   @default(now())
  type       InviteType // USER | CONVERSATION | WORKSPACE | CHANNEL
  lastUsedAt DateTime?
  creator    User       @relation(fields: [createdBy], references: [id])
}
```

### InviteType Enum

| Type | Purpose | entityId |
|------|---------|----------|
| `USER` | Create or join a DM with the inviting user | The inviting user's ID |
| `CONVERSATION` | Join an existing group conversation | The conversation ID |
| `WORKSPACE` | Join a workspace (and its general channel) | The workspace ID |
| `CHANNEL` | Join a specific channel within a workspace | The channel ID |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INVITE FLOW OVERVIEW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌────────┐  │
│  │  Inviter  │───►│  InviteModal │───►│ Workspace  │───►│ Invite │  │
│  │ (Sidebar) │    │ (Chip Input) │    │ Controller │    │  Token │  │
│  └──────────┘    └──────────────┘    └────────────┘    └────┬───┘  │
│                                                              │      │
│                      ┌───────────────────────────────────────┘      │
│                      ▼                                               │
│  ┌──────────────────────────────────────────────────┐               │
│  │         Notification Created (INVITE_RECEIVED)    │               │
│  │  link: /invite?token=<token>                     │               │
│  │  title: "Workspace invite"                       │               │
│  └───────────────────────┬──────────────────────────┘               │
│                          │                                          │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────┐               │
│  │              Recipient Clicks Notification        │               │
│  │                                                  │               │
│  │  ┌──────────────────┐      ┌──────────────────┐  │               │
│  │  │  Authenticated?   │──No──► Store in         │  │               │
│  │  │                  │      │ sessionStorage   │  │               │
│  │  │   Yes            │      │ Redirect to login │  │               │
│  │  └────────┬─────────┘      └────────┬─────────┘  │               │
│  │           │                         │            │               │
│  │           ▼                         ▼            │               │
│  │  ┌──────────────────┐      ┌──────────────────┐  │               │
│  │  │ InviteProcessor  │      │ User logs in →    │  │               │
│  │  │ resolves token   │      │ AuthGate fires    │  │               │
│  │  │ via API          │      │ handleInvite-     │  │               │
│  │  │                  │      │ Continuation()    │  │               │
│  │  └────────┬─────────┘      └────────┬─────────┘  │               │
│  │           │                         │            │               │
│  │           └──────────┬──────────────┘            │               │
│  │                      ▼                           │               │
│  │  ┌──────────────────────────────────────────┐    │               │
│  │  │       POST /invites/resolve              │    │               │
│  │  │       { token: "..." }                   │    │               │
│  │  └──────────────────┬───────────────────────┘    │               │
│  └─────────────────────┼────────────────────────────┘               │
│                        ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                  Server-Side Resolution                      │     │
│  │                                                              │     │
│  │  1. Validate token exists, not revoked, not expired          │     │
│  │  2. Route to type-specific resolver (workspaceResolver)      │     │
│  │  3. Execute onboarding logic (add to workspace + channels)   │     │
│  │  4. Atomic consume (raw SQL guard against concurrency)       │     │
│  │  5. Create MEMBER_JOINED notifications                       │     │
│  │  6. Create INVITE_ACCEPTED notification for inviter          │     │
│  │  7. Return redirect URL (/workspaces/.../channels/...)       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flows

### Flow 1: Workspace Invite via UI (Email-Based Multi-Invite)

**Trigger:** User clicks "Invite People" in the workspace header dropdown or "Invite Someone" in the sidebar.

#### Client-Side

1. **`Sidebar.tsx`** calls `inviteModal.open("WORKSPACE", workspaceId)` using `useInviteModal()` hook
2. The modal state is managed via `InviteModalContext` (shared between opener and renderer)
3. **`AppLayoutShell.tsx`** renders `<InviteModal>` at the top level (outside sidebar constraints)
4. **`InviteModal.tsx`** renders the email chip input:
   - User types an email or username
   - After 300ms debounce, calls `useUsersSearchQuery` → `GET /users/search?q=...`
   - Search results are displayed in a dropdown (showing avatar, username, email)
   - User clicks a result → added as a chip (shows avatar + email, removable with ×)
   - Empty backspace removes the last chip (common UX)
   - Multiple users can be added
5. User clicks "Invite N users" button
6. **`handleSubmit`** calls `inviteMembers(workspaceId, userIds[])` → `POST /workspaces/:id/invite-multiple`

#### Server-Side

7. **`inviteMembers`** handler in `workspaces.controller.ts`:
   - Validates `userIds` array (required, max 50)
   - Fetches workspace details to check membership
   - Iterates each `targetUserId`:
     - Skips if same as inviter ("Cannot invite yourself")
     - Skips if already a member ("Already a member")
     - Calls `sendWorkspaceInvite()` helper
8. **`sendWorkspaceInvite()`** helper:
   - Calls `generateInviteService({ type: "WORKSPACE", entityId: workspaceId, userId: inviterId })`
   - Creates an `INVITE_RECEIVED` notification for the target user with `link: /invite?token=<token>`
9. Returns `{ success, invited: [...], skipped: [...] }` to the client

### Flow 2: Shareable Invite Link

**Trigger:** User opens the invite modal — the invite link section auto-generates.

1. **`InviteModal.tsx`** calls `generate(type, entityId)` via `useInviteLink` hook on open
2. **`useInviteLink`** calls `generateInvite({ type, entityId })` → `POST /invites/generate`
3. **`generateInviteService`** (server):
   - Validates the user has permission to generate invites for the entity
   - Checks for existing active invite (24h rotation policy)
   - If existing active invite found within 24h, returns the same token
   - Otherwise generates a new crypto token (32 random bytes, hex-encoded) with 7-day expiry
4. The full URL is displayed: `<origin>/invite?token=<token>`
5. User copies the link and shares it externally

### Flow 3: Invite Resolution (Accepting)

**Trigger:** A recipient clicks an invite link (`/invite?token=...`) or clicks an `INVITE_RECEIVED` notification.

#### Authenticated User

1. **`InviteProcessor.tsx`** says user is authenticated
2. Calls `POST /invites/resolve { token }`
3. **`resolveInviteService`** (server):
   - Finds the invite by token in a DB transaction
   - Validates: not revoked, not expired, not over maxUses
   - Routes to type-specific resolver:
     - **`workspaceResolver`**: calls `onboardUserToWorkspaceInTransaction` (adds to workspace + general channel)
     - Sends `MEMBER_JOINED` notifications to all existing members
     - Sends `INVITE_ACCEPTED` notification back to the inviter
   - Atomically consumes the invite (raw SQL `UPDATE "Invite" SET "usedCount" = "usedCount" + 1`)
4. Returns `{ redirectUrl: "/workspaces/<id>/channels/<generalId>" }`
5. Client redirects to the workspace channel page

#### Unauthenticated User

1. **`InviteProcessor.tsx`** says user is not authenticated
2. Stores the token in `sessionStorage.setItem("nexus_invite", token)`
3. Redirects to `/login`
4. User logs in via email/password or GitHub OAuth
5. After login, **`AuthGate.tsx`** detects authenticated state
6. Calls `handleInviteContinuation(router)` — reads `sessionStorage` for stored token
7. Calls `POST /invites/resolve { token }` (same resolution flow as above)
8. Redirects to the resolved workspace/channel

---

## API Endpoints

### Invites Module

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/invites/generate` | Required | Generate a new invite token |
| `POST` | `/invites/resolve` | Required | Resolve an invite token (join entity) |

### Workspace Invites (in Workspaces Module)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/workspaces/:id/invite` | Required | Invite single user by username or email |
| `POST` | `/workspaces/:id/invite-multiple` | Required | Batch invite multiple users by userIds |

### Related: User Search (used by InviteModal)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/search?q=...` | Required | Search users by email or username |

---

## Client-Side Architecture

### Key Files

| File | Purpose |
|------|---------|
| `client/src/modules/invites/components/InviteModal.tsx` | Full-screen modal with email chip input, search dropdown, invite link sharing |
| `client/src/modules/invites/components/InviteProcessor.tsx` | Invite page component that resolves tokens for authenticated/unauthenticated users |
| `client/src/modules/invites/lib/handleInvite.ts` | Invite continuation after login (reads sessionStorage, resolves token) |
| `client/src/modules/invites/context/InviteModalContext.tsx` | Shared context for modal state between Sidebar (opener) and AppLayoutShell (renderer) |
| `client/src/modules/invites/hooks/useInviteModal.ts` | Public hook delegating to InviteModalContext |
| `client/src/modules/invites/hooks/useInviteLink.ts` | Hook for generating and managing shareable invite links |
| `client/src/modules/invites/api/invites.api.ts` | API client for invite endpoints |
| `client/src/modules/invites/types/invites.ts` | TypeScript types (`InviteType`) |
| `client/src/app/invite/page.tsx` | Route page wrapping InviteProcessor in Suspense |

### State Management

The invite modal state is shared via **React Context** (`InviteModalContext`):

```
InviteModalProvider (in AppLayoutShell)
  ├── AppLayoutShellInner
  │     ├── Sidebar → useInviteModal().open()  // Opens the modal
  │     └── InviteModal (rendered at top level) // Uses context to read state
  └── Children (passed through)
        └── EmptyState → useInviteModal().open()  // Also opens the modal
```

### InviteModal Component States

| State | UI |
|-------|-----|
| Empty input | "Type email or username..." placeholder |
| Typing (searching) | Loader spinner in dropdown |
| Typing (results) | User cards with avatar, username, email, add button |
| Typing (no results) | "No user found with that email or username" |
| Chips selected | Tags showing avatar + email with × button |
| Submitting | Button shows loader, "Sending invites..." |
| Success | Toast "Invite sent to N user(s)", modal closes |
| Partial success | Toast + modal stays open with skipped explanations |
| Invite link loading | "Generating secure link..." spinner |
| Invite link ready | Copyable URL with expiration date |

---

## Server-Side Architecture

### Key Files

| File | Purpose |
|------|---------|
| `server/src/modules/invites/invites.service.ts` | Core business logic: `generateInviteService`, `resolveInviteService`, revocation helpers |
| `server/src/modules/invites/invites.controller.ts` | HTTP handlers for `/invites/generate`, `/invites/resolve` |
| `server/src/modules/invites/invites.repository.ts` | Database operations: CRUD, atomic consume, active invite lookup |
| `server/src/modules/invites/invites.routes.ts` | Route definitions |
| `server/src/modules/invites/invites.types.ts` | TypeScript interfaces: `ResolveInviteParams`, `GenerateInviteResult`, `DomainEvent` |
| `server/src/modules/invites/resolvers/index.ts` | Resolver registry mapping InviteType → resolver |
| `server/src/modules/invites/resolvers/workspaceResolver.ts` | Workspace-specific invite logic |
| `server/src/modules/invites/resolvers/userResolver.ts` | User DM invite logic |
| `server/src/modules/invites/resolvers/conversationResolver.ts` | Group conversation invite logic |
| `server/src/modules/invites/resolvers/channelResolver.ts` | Channel invite logic |
| `server/src/modules/workspaces/workspaces.controller.ts` | Contains `inviteMemberByUsername`, `inviteMembers` handlers |

### Invite Validation Flow

```
generateInviteService({ type, entityId, userId })
  │
  ├─ 1. Type-based validation
  │     WORKSPACE → Check caller is a workspace member
  │     CONVERSATION → Check caller is a conversation member (not DM)
  │     USER → Set entityId to caller's userId
  │     CHANNEL → entityId required
  │
  ├─ 2. Rotation policy (24h window)
  │     Existing active invite found → Return same token if < 24h old
  │     Existing invite > 24h old → Revoke it, generate new
  │
  └─ 3. Token generation
        crypto.randomBytes(32).toString('hex')
        7-day expiry from now
```

### Invite Resolution Flow

```
resolveInviteService({ token, userId })
  │
  ├─ 1. Find invite by token (in transaction)
  │
  ├─ 2. Validate
  │     Token exists? revoked? expired? maxUses reached?
  │
  ├─ 3. Route to resolver by type
  │     workspaceResolver.resolve({ tx, invite, actorId })
  │
  ├─ 4. Resolver executes domain logic
  │     workspaceResolver:
  │       ├─ Verify workspace exists
  │       ├─ onboardUserToWorkspaceInTransaction (add to workspace + general channel)
  │       ├─ MEMBER_JOINED notifications to existing members
  │       └─ INVITE_ACCEPTED notification to inviter
  │
  ├─ 5. Atomic consume
  │     Raw SQL: UPDATE "Invite" SET usedCount+1 WHERE id=...
  │     Guards: revoked=false, not expired, under maxUses
  │     If 0 rows affected → throw INVALID_OR_EXPIRED_INVITE (race condition)
  │
  └─ 6. Return { redirectUrl, events }
```

---

## Edge Cases & Behavior

| Scenario | Behavior |
|----------|----------|
| **Invite self** | Skipped with "Cannot invite yourself" message |
| **Already a member** | Skipped with "Already a member" message |
| **User not found by email** | Search dropdown shows "No user found" |
| **Token expired** | `resolveInviteService` throws `INVALID_OR_EXPIRED_INVITE` → error toast on client |
| **Token revoked** | Same as expired — cannot be resolved |
| **Concurrent resolution** | Raw SQL atomic update prevents double-acceptance |
| **Same token shared (rotation)** | All invited users share one token when invites sent within 24h window. Token has no maxUses by default, so all can join. This is acceptable for workspace invites but means notifications point to a shared URL. |
| **Workspace deleted between invite and acceptance** | `workspaceResolver` throws `WORKSPACE_NOT_FOUND` |
| **User deleted after invite sent** | `onboardUserToWorkspaceInTransaction` runs but may fail on user lookup |
| **Duplicate workspace member** | `onboardUserToWorkspaceInTransaction` catches `P2002` unique constraint error gracefully |
| **General channel missing** | `onboardUserToWorkspaceInTransaction` throws `GENERAL_CHANNEL_NOT_FOUND` |
| **Batch invite partial failure** | Each user is handled independently; `inviteMembers` returns both `invited` and `skipped` arrays |

---

## Notifications Produced by Invite System

| Notification Type | When | Recipient | Link |
|------------------|------|-----------|------|
| `INVITE_RECEIVED` | User is invited to workspace | The invited user | `/invite?token=<token>` |
| `INVITE_ACCEPTED` | Invited user accepts and joins | The inviter | `/workspaces/.../channels/...` |
| `MEMBER_JOINED` | New member joins via invite | All existing workspace members | `/workspaces/.../channels/...` |

---

## Recent Fixes (June 2026)

### Bug 1: Invite Modal Not Full Screen
- **Root cause:** `InviteModal` was rendered inside `Sidebar.tsx`, constrained by the sidebar's DOM bounds
- **Fix:** Moved `<InviteModal>` to `AppLayoutShell.tsx` at the top level with higher z-index (`z-[100]`)

### Bug 2: Invite by Username Was Limiting
- **Root cause:** Single username input, no search, no multi-select
- **Fix:** Replaced with email-based chip input with debounced search, multi-user selection, batch invite button

### Bug 3: Broken Invite → Notification → Login → Redirect Flow
- **Root cause:** `inviteMemberByUsername` sent notification link as `/invite?workspace=<id>` without a token. `InviteProcessor` expects a `token` param, so the flow broke
- **Fix:** `sendWorkspaceInvite` now generates a proper invite token via `generateInviteService` and includes it in the notification link as `/invite?token=<token>`

### Bug 4: Invite Button Not Working (State Split)
- **Root cause:** `useInviteModal()` used local `useState`, so `Sidebar.tsx` (opener) and `AppLayoutShell.tsx` (renderer) had independent state
- **Fix:** Created `InviteModalContext` with a shared `InviteModalProvider`, updated `useInviteModal` to use the context
