# Auth Module Bug Analysis

Covers server (`server/src/modules/auth/`) and client (`client/src/modules/auth/`) auth & permission code.

**Last updated:** 2026-06-16 (Bug 2 fixed, Bug 1 & 5 resolved, Bug 19 added)

---

## CRITICAL BUGS

### 1. ~~No User Record Created in Prisma DB After Supabase Registration~~ ✅ RESOLVED

**Files:**
- `server/prisma/SUPABASE_QUERIES.sql:1-33` — database trigger `handle_new_user`

**Status:** The Supabase database trigger `on_auth_user_created` is already deployed and creates the Prisma `User` record synchronously via `AFTER INSERT ON auth.users`. The trigger maps:
- `auth.users.id` → `User.id`
- `auth.users.email` → `User.email`
- `raw_user_meta_data->>'username'` → `User.username` (falls back to email prefix)
- `raw_user_meta_data->>'avatar_url'` → `User.avatarUrl`

**Remaining concern:** The registration only passes `username` in metadata — `fullName` is not forwarded (see Bug 4). The trigger does not set `isOnboarded` (Prisma's `@default(false)` handles this), and does not check for `full_name` in metadata.

### 2. ~~401 Interceptor Uses `getSession()` Instead of `refreshSession()`~~ ✅ FIXED 2026-06-16

**File:** `client/src/shared/lib/api.ts:26`

**Status:** Changed from `supabase.auth.getSession()` to `supabase.auth.refreshSession()`. The `_retry` flag prevents infinite recursion. Tokens are now properly refreshed on 401 responses.

### 3. AuthProvider + AuthGate Race on Post-Login Redirect

**Files:**
- `client/src/shared/providers/auth-provider.tsx:42-43` — `SIGNED_IN` only redirects if on auth routes
- `client/src/shared/providers/AuthGate.tsx:23-26` — onboarding check + `handleInviteContinuation`

**Mitigation:** The `SIGNED_IN` handler now checks `pathnameRef.current?.startsWith(APP_ROUTES.AUTH.INDEX)` before redirecting (auth-provider.tsx:42), reducing the window for races. However, React's `useEffect` ordering between `AuthProvider` and `AuthGate` is still non-deterministic. If the user is on an auth route when `SIGNED_IN` fires, `AuthProvider` pushes to conversations while `AuthGate` may immediately redirect to onboarding or handle invite continuation — causes a brief flash.

### 4. Registration Doesn't Forward `fullName` to Supabase

**File:** `client/src/modules/auth/hooks/useAuth.ts:42-46`

```typescript
options: {
  data: {
    username: data.username,
  },
},
```

Only `username` is passed in `options.data`. If the registration form collects `fullName`, it's silently dropped. The `user_metadata` in Supabase will be missing the user's display name. The onboarding form re-collects `fullName`, but if the user somehow skips onboarding or auto-provisioning is needed, the name is lost. The `SUPABASE_QUERIES.sql` trigger does not check for `full_name` in metadata.

### 5. Email Confirmation Flow Has No User-Facing UI

**File:** `client/src/modules/auth/hooks/useAuth.ts:52`

```typescript
router.replace(`${APP_ROUTES.AUTH.LOGIN}?registered=true&confirm=true`);
```

When email confirmation is required, the user is redirected to login with query params `?registered=true&confirm=true`. However, there is **no UI component** on the login page that reads these query params and shows a confirmation message. The user sees the normal login form with no indication that they need to check their email.

---

## MEDIUM BUGS

### 1. `checkConversationAccess` Doesn't Filter Soft-Deleted Conversations

**File:** `server/src/modules/auth/auth.repository.ts:14-44`

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

Uses `.js` extension import (`./auth.repository.js`). This is consistent with the rest of the server codebase (all server imports use `.js`), but mixed conventions may still appear elsewhere.

### 13. `handleSignIn` Has No Error Handling for Socket Connect Failure

**File:** `client/src/modules/auth/lib/auth-orchestrator.ts:5-9`

```typescript
export const handleSignIn = () => {
  if (!socket.connected) {
    socket.connect();
  }
};
```

`socket.connect()` is fire-and-forget. If the connection fails (auth error, network issue), `handleSignIn` has no way to know. The user appears authenticated (Supabase session exists) but the socket is disconnected. Real-time features silently don't work. The user sees stale data until they manually refresh.

### 14. `handleSignIn` Called Twice on First Login

**File:** `client/src/shared/providers/auth-provider.tsx:35-40`

On first login/registration:
1. `INITIAL_SESSION` fires with the session → calls `handleSignIn()` (line 35)
2. `SIGNED_IN` immediately follows → calls `handleSignIn()` again (line 40)

Both calls invoke `socket.connect()`, which is idempotent but triggers two `connect` events, two `presence:initial` responses, and two rounds of React Query cache invalidation. Redundant network traffic on every login.

### 15. No Server-Side CSRF Protection on Auth Endpoints

The Express app trusts `credentials: 'include'` via CORS but has no CSRF token mechanism. Since auth is handled by Supabase (not Express), this is partially mitigated — but the Express `/api/me` and other authenticated endpoints have no CSRF protection if accessed via cookie-based auth in the future.

### 16. Login Form Shows Generic Error on Network Failure

**File:** `client/src/modules/auth/hooks/useAuth.ts:28`

```typescript
const message = err instanceof Error ? err.message : "An error occurred during login.";
```

Supabase error messages can be technical (e.g., `"Invalid login credentials"`). These are shown verbatim to the user. There's no mapping to user-friendly messages (e.g., "Invalid email or password" vs. "Too many attempts. Please try again later.").

### 17. `isOnboarded` Check Can Fail to Redirect on Profile Load Error

**File:** `client/src/shared/providers/AuthGate.tsx:22`

```typescript
if (isInitialized && user && profile) {
  if (!profile.isOnboarded && !isOnboardingRoute) {
    router.push('/onboarding');
  }
```

**Mitigation:** The guard `profile &&` prevents redirects before profile data loads. However, if `profile` is undefined after loading completes (e.g., `/api/me` returned 404 because no User record exists in Prisma), the condition is `false` and the user is never redirected to onboarding. They see a blank protected page (`null` at line 40-42) with no error feedback.

### 18. `RegisterForm` Zod Schema Requires Confirm Password But `useAuth.register` Doesn't Use It

**Files:**
- `client/src/modules/auth/schemas/auth.ts:14-25` — schema includes `confirmPassword` with `refine`
- `client/src/modules/auth/hooks/useAuth.ts:39-47` — register function ignores `confirmPassword`

The registration form validates `confirmPassword` via Zod, but the `register` function in `useAuth` uses `RegisterFormData` which includes `confirmPassword` — yet it's never sent to Supabase. The field provides client-side UX validation only, but if the schema and handler fall out of sync, the field becomes confusing dead weight.

### 19. `username` Not Unique in Prisma Schema

**File:** `server/prisma/schema.prisma:15`

```prisma
username  String
```

No `@unique` constraint on `username`. Multiple users can register with the same username — there is no server-side or client-side uniqueness check anywhere in the codebase. This causes:

- **Duplicate registrations** — User A and User B can both have `username: "john"`
- **Broken mentions** — `@john` cannot resolve to a single user
- **Broken invites** — invite-by-username may target the wrong user
- **Broken search** — `GET /api/users/search?q=john` returns duplicates

The Supabase trigger at `SUPABASE_QUERIES.sql:19` uses `COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))` and does not check for existing usernames.

**Fix:** Add `@unique` to `username`, generate a Prisma migration, add a server-side username availability endpoint (`GET /api/users/check-username?q=`), and add client-side debounced validation in the register form.

**Files:**
- `client/src/modules/auth/schemas/auth.ts:14-25` — schema includes `confirmPassword` with `refine`
- `client/src/modules/auth/hooks/useAuth.ts:39-47` — register function ignores `confirmPassword`

The registration form validates `confirmPassword` via Zod, but the `register` function in `useAuth` uses `RegisterFormData` which includes `confirmPassword` — yet it's never sent to Supabase. The field provides client-side UX validation only, but if the schema and handler fall out of sync, the field becomes confusing dead weight.
