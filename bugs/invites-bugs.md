# Invite System Bug Analysis

## Workspace & DM Invite Flows

---

## CRITICAL BUGS

### 1. Notifications Written Outside Transaction — Phantom Notifications on Rollback

**Files:** `server/src/modules/invites/resolvers/workspaceResolver.ts:46-59, 66-91` · `server/src/modules/invites/invites.service.ts:38-44` · `server/src/modules/notifications/notifications.service.ts:51`

`createAndDispatch()` (notifications.service.ts:51) writes to the DB via the **global Prisma client**, not the transaction client (`tx`). When called inside the workspace resolver (which runs inside the Prisma transaction), the notification is committed immediately and independently.

If the transaction later rolls back (e.g., invite consumption at invites.service.ts:38-44 fails due to a race condition), the notification persists in the DB even though the workspace join was rolled back. The recipient sees a "New member" or "User X joined" notification for an action that never actually completed.

### 2. DM Created Outside Transaction — Orphan DM on Rollback

**Files:** `server/src/modules/invites/resolvers/userResolver.ts:9` · `server/src/modules/conversations/conversations.service.ts:75-95` · `server/src/modules/invites/invites.service.ts:33-44`

The `userInviteResolver` calls `createOrGetDM(actorId, invite.entityId)` which uses the **global Prisma client** (via `conversations.repository.ts`), NOT the transaction client (`tx`) passed in the resolver context. The DM is committed to the DB immediately.

If the invite consumption step (invites.service.ts:38-44) then fails — e.g., due to a concurrent request consuming the invite first — the transaction rolls back, but the DM already exists in the DB permanently. The DM is orphaned from the invite system (not associated with any consumed invite).

Additionally, because the query in `createOrGetDM` (conversations.service.ts:76) and the DM creation (line 81) both use the global prisma instead of `tx`, there's a TOCTOU race window between the existence check and the creation.

---

## MEDIUM BUGS

### 3. Partial Membership on P2002 in `onboardUserToWorkspaceInTransaction`

**File:** `server/src/modules/workspaces/workspaces.repository.ts:125-146`

The single try-catch wrapping both `workspaceMember.create` and `conversationMember.create` means that if the first succeeds and the second fails with `P2002` (unique constraint violation — already a general channel member), the error is silently swallowed. The user ends up as a **workspace member but NOT a member of the general channel**. This is an inconsistent state.

Conversely, if `workspaceMember.create` fails with P2002 (already a workspace member), it's silently ignored and the code proceeds to try `conversationMember.create`. This is at least recoverable, but the function provides no feedback that the user was already a member.

### 4. `findExistingActiveInvite` Ignores `maxUses` Exhaustion

**File:** `server/src/modules/invites/invites.repository.ts:14-29`

The active-invite lookup only checks `revoked: false` and `expiresAt`, but omits the `usedCount < maxUses` condition. If a shareable invite was configured with `maxUses` and has been fully consumed (`usedCount >= maxUses`), the 24-hour rotation policy will still return the exhausted token to the inviter. The inviter sees their old link, but anyone trying to use it gets `INVALID_OR_EXPIRED_INVITE`.

### 5. Missing Existence Check Before `conversationMember.create` in Conversation Resolver

**File:** `server/src/modules/invites/resolvers/conversationResolver.ts:12-26`

The resolver checks `conversation?.type === "DM"` to guard against adding members to DMs, but if the conversation doesn't exist at all (`conversation` is `null`), `null?.type === "DM"` evaluates to `false`, so the guard passes. The code then proceeds to `tx.conversationMember.create` with a non-existent `conversationId`, which throws a foreign-key constraint violation. This is caught by neither P2002 nor the resolver's own error handling, producing a generic 500 error.

The existence check should be separate from the DM-type check:
```
if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
if (conversation.type === "DM") throw new Error("CANNOT_JOIN_DM");
```

### 6. `CANNOT_JOIN_DM_VIA_CONVERSATION_INVITE` Mapped to Generic 500

**Files:** `server/src/modules/invites/resolvers/conversationResolver.ts:18` · `server/src/modules/invites/invites.service.ts:46-51`

The error `"CANNOT_JOIN_DM_VIA_CONVERSATION_INVITE"` is thrown by the conversation resolver but is not handled in `resolveInviteService`'s catch block. It falls through to the generic `console.error` + `"INTERNAL_SERVER_ERROR"` path, giving the user a misleading "Internal server error" message.

Similarly, `"RESOLVER_NOT_FOUND"` (invites.service.ts:31) and `"WORKSPACE_NOT_FOUND"` (workspaceResolver.ts:16) are not handled in the controller, producing generic 500 errors instead of appropriate 400/404 responses.

### 7. Resolver Registry — Unchecked `CHANNEL` Type Accepts Invites But Always Fails

**Files:** `server/src/modules/invites/resolvers/channelResolver.ts:4-6` · `server/src/modules/invites/invites.service.ts:30-31` · `server/src/modules/invites/resolvers/index.ts:28`

The `CHANNEL` resolver exists in the registry but always throws `NOT_IMPLEMENTED`. The `generateInvite` endpoint does not prevent creating CHANNEL-type invites (no validation rejects `type: "CHANNEL"` in the controller). So users/API callers can generate CHANNEL invite tokens, but anyone trying to resolve them gets a 500 error.

### 8. Unsafe `tx as any` Cast Obscures Type Mismatch

**File:** `server/src/modules/invites/resolvers/workspaceResolver.ts:20`

The `PrismaTransaction` type in resolvers/index.ts uses `Omit<Prisma.TransactionClient, ...>`, which strips methods that `onboardUserToWorkspaceInTransaction` expects on its `tx` parameter. The `as any` cast silences this mismatch at the call site. If the underlying repository function ever uses an omitted method, the error only surfaces at runtime.

---

## MINOR BUGS

### 9. `resolvedRef` Set Before API Completion Prevents Retry

**File:** `client/src/modules/invites/components/InviteProcessor.tsx:32`

The `resolvedRef.current = true` is set **before** the API call completes. If the `POST /invites/resolve` call fails (network error, timeout), the ref prevents any retry within the component's lifecycle. The user must manually refresh the page to try again.

### 10. `InviteProcessor` and `handleInviteContinuation` Race for the Same Invite

**Files:** `client/src/modules/invites/components/InviteProcessor.tsx:31-45` · `client/src/shared/providers/AuthGate.tsx:17-21` · `client/src/modules/invites/lib/handleInvite.ts:25-28`

When an unauthenticated user visits `/invite?token=xxx`:
1. `InviteProcessor` stores the token in sessionStorage and redirects to login.
2. After login, the auth flow redirects back to `/invite?token=xxx`.
3. **`AuthGate.useEffect`** fires `handleInviteContinuation`, which reads the token from sessionStorage and calls `POST /invites/resolve`.
4. **`InviteProcessor.useEffect`** also fires (on the `/invite` page), reads the token from the URL, and calls `POST /invites/resolve`.
5. Both calls happen near-simultaneously. One succeeds and consumes the invite; the other gets `INVALID_OR_EXPIRED_INVITE` and shows an error toast to the user. The user sees a confusing "Failed to join via invite" toast even though the invite was accepted.

Additionally, the sessionStorage item is only removed after the API response (handleInvite.ts:28, 36). If the `InviteProcessor` call completes first, the `handleInviteContinuation` call still finds the token in sessionStorage and retries, getting an error.

### 11. Inaccurate Error Messages in Controller

**File:** `server/src/modules/invites/invites.controller.ts:12-13, 62-63`

- `resolveInvite`: Checks `if (!token || !userId)` but always returns `"Missing token"` regardless of which value is missing.
- `generateInvite`: Checks `if (!type || !userId)` but always returns `"Missing type"` regardless.

### 12. Unnecessary `crypto` Import

**File:** `server/src/modules/invites/invites.service.ts:4`

`crypto` is imported at the top of the file but the actual call to `crypto.randomBytes` is not statically resolvable in modern bundlers/ESM. The import works at runtime but is misleading.

### 13. Batch Invite Doesn't Validate That Input User IDs Exist

**File:** `server/src/modules/workspaces/workspaces.controller.ts:269-336`

The `inviteMembers` handler receives an array of `userIds` but never verifies they correspond to actual `User` records. If a non-existent UUID is passed, `sendWorkspaceInvite` still generates an invite token and creates an `INVITE_RECEIVED` notification. The notification targets a non-existent userId — the foreign key constraint on the Notification table (`userId` references `User.id`) will cause a 500 error for that individual invite (caught by the inner try-catch at line 317), but the other invites proceed. The caller gets a misleading `skipped` reason (the raw Prisma error message).

### 14. `removeWorkspaceMember` Doesn't Handle Dangling Invites

**Files:** `server/src/modules/workspaces/workspaces.repository.ts:177-199` · `server/src/modules/invites/invites.repository.ts:60-68`

When a user is removed from a workspace (`removeWorkspaceMember`), the function removes them from all workspace channels and deletes the `WorkspaceMember` record — but it does NOT revoke any outstanding invites for that workspace. Old invite tokens remain valid, and a removed user who has their invite link saved could theoretically re-join if the token is still active.

`revokeAllInvitesForEntity` exists in the invites repository but is never called during member removal.

### 15. Double Notification Fetch in Workspace Resolver

**File:** `server/src/modules/invites/resolvers/workspaceResolver.ts:29-32, 68-71`

The `joiner` (actor) user data is fetched twice — once for the MEMBER_JOINED notification block (line 29) and again for the INVITE_ACCEPTED block (line 68). Both fetches are inside the same transaction and could be lifted to a single fetch before both blocks.

---

## DESIGN OBSERVATIONS (not bugs, but notable)

- **Any workspace member can invite**: `inviteMemberByUsername` and `inviteMembers` only check workspace membership (via `getWorkspaceDetails`), not the inviter's role. There is no ADMIN/OWNER gate on who can invite.
- **`CHANNEL` invite type is fully stubbed**: The resolver throws `NOT_IMPLEMENTED`, but `generateInvite` accepts `type: "CHANNEL"` without rejection. The `InviteModal` references `type: "CHANNEL"` in the `"Please select a target"` placeholder.
- **Shareable invite links have unlimited uses by default**: `maxUses` is nullable and defaults to `null` (unlimited) when not set. The `generateInvite` API never sets `maxUses`.
- **No rate limiting on invite generation**: `POST /invites/generate` can be called arbitrarily, creating unlimited invite records.
