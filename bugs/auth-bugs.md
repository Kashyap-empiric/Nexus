# Auth Module Bug Analysis

Covers server (`server/src/modules/auth/`) and client (`client/src/modules/auth/`) auth & permission code.

---

## MEDIUM BUGS

### 1. `checkConversationAccess` Doesn't Filter Soft-Deleted Conversations

**File:** `server/src/modules/auth/auth.repository.ts:15-25`

`checkConversationAccess` queries the conversation without checking `deletedAt`. If a conversation is soft-deleted, the function still returns access for existing members. The deleted conversation should be treated as non-existent.

### 2. `findWorkspaceChannelsByUserId` Returns Channels From All Workspaces, Not Just Active Ones

**File:** `server/src/modules/auth/auth.repository.ts:58-84`

This query finds all channels the user can access across ALL their workspaces in a single query. If a user has been removed from a workspace but the `WorkspaceMember` record wasn't cleaned up (or vice versa), stale workspace memberships leak channels from workspaces the user should no longer access.

### 3. Client Auth Uses `useState` for Loading — No Global Auth Loading State

**File:** `client/src/modules/auth/hooks/useAuth.ts:11`

Each `useAuth()` instance has its own `isLoading` state. If login is initiated from one component, another component using `useAuth()` won't see the loading state. If two components mount simultaneously, they create duplicate auth state. The `useAuthStore` exists but hook-level state duplicates it.

### 4. No Rate Limiting on Client Login/Register Calls

**File:** `client/src/modules/auth/hooks/useAuth.ts:14-62`

The client-side auth calls to Supabase have no rate limiting or debouncing. A user could spam the login/register buttons, firing multiple simultaneous Supabase requests. This is partially mitigated by Supabase server-side rate limits but the client provides no feedback.

### 5. OAuth GitHub Login Doesn't Handle Popup Blockers

**File:** `client/src/modules/auth/hooks/useAuth.ts:64-82`

`signInWithOAuth` opens a new window for GitHub auth. If the user has a popup blocker, the OAuth flow silently fails. There's no fallback to redirect-based OAuth.

### 6. `logout` Doesn't Clear Local State Before Navigation

**File:** `client/src/modules/auth/hooks/useAuth.ts:84-97`

The comment notes "Teardown and routing are now handled by AuthProvider's onAuthStateChange listener," but there's a race: if `onAuthStateChange` fires before `logout`'s `setIsLoading(false)` runs, the loading state briefly flashes. If `onAuthStateChange` fires after, the user sees loading state during navigation.

### 7. `WorkspaceAccess` Type Has `role` Field But Never Populated

**File:** `server/src/modules/auth/auth.types.ts:7-10`

```typescript
export interface WorkspaceAccess {
  isMember: boolean;
  role: "ADMIN" | "MEMBER" | null;
}
```

This type is defined but never returned by any service function. All workspace member checks only return `boolean`. The type is dead code.

### 8. `getUserWorkspaceChannels` Only Returns Channel IDs, Not Metadata

**File:** `server/src/modules/auth/auth.service.ts:16-18` / `server/src/modules/auth/auth.repository.ts:82`

The function selects only `{ id: true }` from channels. Any consumer needing channel names or visibility must re-query. This is a design inefficiency.

---

## MINOR BUGS

### 9. `findConversationMembershipsByUserId` Only Returns DM Conversations

**File:** `server/src/modules/auth/auth.repository.ts:46-56`

The query filters `conversation: { type: "DM" }`, which means users only join socket rooms for DM conversations on connect. Workspace channel room joins happen separately. If either query fails, the user misses events for that conversation type entirely.

### 10. `findWorkspaceMember` Uses `findUnique` — Skips Duplicate Memberships

**File:** `server/src/modules/auth/auth.repository.ts:7`

Uses `findUnique` on a composite key. If somehow duplicate `WorkspaceMember` records exist (data integrity issue), only one is returned and the function reports the user as a member. `findFirst` would be more predictable for edge cases.

### 11. No Auth Request Logging

No audit trail for authentication attempts (login, logout, failed permission checks). Debugging unauthorized access requires adding console.log statements manually.

### 12. Import Extension Inconsistency

**File:** `server/src/modules/auth/auth.service.ts:1`

Uses `.js` extension import (`./auth.repository.js`) while other server files use `.js` consistently — but some files omit extensions entirely. Mixed conventions make refactoring fragile.
