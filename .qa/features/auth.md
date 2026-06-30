# Feature: Authentication

## Goal

Allow users to register, log in, and maintain authenticated sessions using email/password or GitHub OAuth, with session persistence across page refreshes and route protection for all API endpoints.

---

## Current Status

```
Partially Implemented
```

Login, registration, JWT verification middleware, and route protection exist. OAuth (GitHub) depends on Supabase configuration and is not verified through server-side code. The server only verifies JWTs — it does not handle registration or login directly; those flows are managed by Supabase Auth on the client side.

---

## High-Level Summary

- Supabase Auth handles registration, login, OAuth, and session lifecycle entirely on the client.
- Server verifies JWTs locally using JWKS keys fetched at startup (no network calls per request).
- User sync from Supabase Auth to the Prisma User table is done via a database trigger (`on_auth_user_created`).
- `authMiddleware` protects all API routes; `rejectDeletingAccount` blocks actions for accounts being deleted.
- No server-side registration or login endpoints exist — all auth is client-side via Supabase.
- No brute-force protection, IP-based rate limiting, or session revocation endpoints exist on the server.
- Client-side `AuthGate` component redirects unauthenticated users to `/login`.

---

## Code Locations

```
Backend

server/src/middlewares/auth.ts              — JWT verification middleware
server/src/middlewares/accountStatus.ts     — Blocks actions for deleting accounts
server/src/utils/jwt.ts                     — JWKS fetch + token verification
server/src/config/env.ts                    — JWT_SUPABASE env vars
server/src/modules/auth/auth.service.ts     — Membership verification helpers
server/src/modules/auth/auth.repository.ts  — Prisma membership queries
server/src/modules/auth/auth.types.ts       — Membership type definitions

Frontend

client/src/modules/auth/index.ts                       — Module barrel
client/src/modules/auth/lib/auth-orchestrator.ts       — Auth orchestration
client/src/modules/auth/hooks/useAuth.ts               — Auth hook
client/src/modules/auth/schemas/auth.ts                — Zod schemas for auth forms
client/src/modules/auth/store/useAuthStore.ts          — Zustand auth store
client/src/modules/auth/components/LoginForm.tsx        — Login form
client/src/modules/auth/components/RegisterForm.tsx     — Registration form
client/src/modules/auth/components/ForgotPasswordForm.tsx  — Forgot password form
client/src/modules/auth/components/ResetPasswordForm.tsx   — Reset password form
client/src/modules/auth/components/AuthSidebar.tsx     — Auth page sidebar
client/src/modules/auth/components/MobileAuthHeader.tsx  — Mobile header
client/src/shared/providers/auth-provider.tsx           — React context provider
client/src/shared/providers/AuthGate.tsx                — Route guard component
client/src/app/(auth)/login/page.tsx                   — Login page
client/src/app/(auth)/register/page.tsx                — Register page
client/src/app/auth/callback/page.tsx                  — OAuth callback page

Shared

client/src/socket/socket-events.ts                     — Socket event constants
```

---

## Database

```prisma
model User {
  id              String    @id
  email           String    @unique
  avatarUrl       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  username        String    @unique
  fullName        String?
  bio             String?
  status          UserStatus @default(AVAILABLE)
  statusText      String?
  avatarPath      String?
  isOnboarded     Boolean   @default(false)
  isDeleting      Boolean   @default(false)
  pushNotificationsEnabled    Boolean @default(true)
  dmNotifications             Boolean @default(true)
  mentionNotifications        Boolean @default(true)
  channelNotifications        Boolean @default(false)
  inviteNotifications         Boolean @default(true)
  replyNotifications          Boolean @default(true)
  threadNotifications         Boolean @default(true)
  workspaceActivityNotifications Boolean @default(true)
}
```

- `User` table is populated via Supabase database trigger `on_auth_user_created`, not by server code.
- No server-side registration endpoint exists.
- Email and username are both unique constraints at the DB level.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/me` | Required | Returns current user profile |

### Missing Endpoints

- No server-side `POST /api/auth/register` — registration is client-side via Supabase.
- No server-side `POST /api/auth/login` — login is client-side via Supabase.
- No server-side `POST /api/auth/logout` — handled by Supabase client SDK.
- No session revocation endpoint.

### Request Validation

- No Zod validation on `/api/me` (parameterless GET).
- Auth schemas exist at `client/src/modules/auth/schemas/auth.ts` for client-side form validation.

### Permissions

- `authMiddleware` protects all routes except public ones (invite info, username check).
- `rejectDeletingAccount` prevents actions when `User.isDeleting === true`.

---

## Backend Implementation

### authMiddleware (`server/src/middlewares/auth.ts`)

- Extracts Bearer token from `Authorization` header.
- Calls `verifyToken()` to decode and verify the JWT using local JWKS keys.
- Attaches decoded user payload to `req.user`.
- Returns 401 on missing/invalid token.

### rejectDeletingAccount (`server/src/middlewares/accountStatus.ts`)

- Queries `User.isDeleting` from database.
- Returns 403 if account is being deleted.
- Skips check if no userId present.

### JWT Verification (`server/src/utils/jwt.ts`)

- Fetches JWKS from Supabase on startup and caches them.
- Verifies JWT signature locally (zero network calls per request).
- Returns decoded user payload.

### Auth Service (`server/src/modules/auth/auth.service.ts`)

- `isWorkspaceMember()` — checks workspace membership via repository.
- `verifyConversationMembership()` — checks conversation access.
- `getUserConversationMemberships()` — returns DM conversation IDs.
- `getUserWorkspaceChannels()` — returns accessible channel IDs.
- `getUserWorkspaceIds()` — returns workspace IDs where user is a member.

### Socket Auth (`server/src/socket/middlewares/auth.ts`)

- Not found during code audit — socket auth is handled inline in `server/src/socket/socket.ts` via `socket.data.user`.

---

## Frontend Implementation

### useAuthStore (`client/src/modules/auth/store/useAuthStore.ts`)

- Zustand store managing auth state: user, session, loading.
- Persists session across page refreshes via Supabase SSR cookies.
- Provides `useUser()`, `useAuthInitialized()` selectors.

### AuthGate (`client/src/shared/providers/AuthGate.tsx`)

- Reads auth state from store.
- Redirects unauthenticated users to `/login`.
- Shows loading state while auth initializes.

### LoginForm / RegisterForm

- Client-side form validation using Zod schemas.
- Calls Supabase client SDK (`signInWithPassword`, `signUp`).
- Handles error display (invalid credentials, duplicate email, weak password).

### AuthProvider (`client/src/shared/providers/auth-provider.tsx`)

- Initializes Supabase client and listens for auth state changes.
- Calls `/api/me` on auth state change to sync server-side user data.
- Wraps the application.

### OAuth Callback (`client/src/app/auth/callback/page.tsx`)

- Handles OAuth redirect from Supabase.
- Exchanges auth code for session.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Email/password login | ✅ | Supabase `signInWithPassword` in LoginForm |
| GitHub OAuth | ✅ | Configured in Supabase, callback page exists |
| JWT verification middleware | ✅ | `authMiddleware` in `server/src/middlewares/auth.ts` |
| Local JWKS verification | ✅ | `verifyToken` in `server/src/utils/jwt.ts` |
| Session persistence | ✅ | Supabase SSR cookies |
| Route protection | ✅ | `AuthGate` component |
| Account deletion guard | ✅ | `rejectDeletingAccount` middleware |
| Server-side registration endpoint | ❌ | All registration is client-side via Supabase |
| Server-side login endpoint | ❌ | All login is client-side via Supabase |
| Brute-force protection | ❌ | No IP-based rate limiting on auth |
| Session revocation endpoint | ❌ | No server-side session management |
| Password strength validation server-side | ❌ | Only client-side Zod validation |
| OAuth callback tests | ⚠️ | Page exists, but no server-side verification |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Register with valid email+password | User created, redirected to onboarding | Supabase signUp called, user created via trigger, redirected | ✅ |
| Register with duplicate email | Error: email already exists | Supabase returns error, displayed on form | ✅ |
| Register with weak password | Error: password too weak | Client-side Zod validation rejects | ✅ |
| Login with correct credentials | Session created, redirected to app | Supabase signInWithPassword called | ✅ |
| Login with wrong password | Error: invalid credentials | Supabase returns error, displayed | ✅ |
| Access protected route without auth | Redirect to /login | AuthGate redirects | ✅ |
| Expired JWT | 401 response, redirect to login | authMiddleware returns 401, client detects | ✅ |
| Refresh page while logged in | Session persists | Supabase SSR cookies restore session | ✅ |
| Account being deleted | 403 on all write actions | rejectDeletingAccount middleware | ✅ |
| OAuth login | Redirect to provider, callback to app | Callback page exists, exchanges code | ✅ |
| API call without Authorization header | 401 error | authMiddleware returns 401 | ✅ |

---

## Current Flow

```
User visits protected page
  ↓
AuthGate checks auth state from store
  ↓
Not authenticated → redirect to /login
  ↓
User logs in via Supabase client SDK (signInWithPassword)
  ↓
Supabase returns session with JWT
  ↓
AuthProvider detects auth state change
  ↓
Client calls GET /api/me with JWT in Authorization header
  ↓
authMiddleware extracts and verifies JWT via local JWKS
  ↓
Returns user profile from Prisma
  ↓
AuthGate allows access to protected routes
```

---

## Missing Pieces

```
□ Server-side registration endpoint with validation
□ Server-side login endpoint with rate limiting
□ IP-based brute-force protection
□ Session revocation endpoint
□ Password change notification
□ Multi-device session management
□ Email verification flow (not found in codebase)
□ Two-factor authentication
□ Account lockout after failed attempts
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| User deleted in Supabase but not in Prisma | No sync mechanism — user remains in Prisma | ❌ |
| JWKS rotation | JWKS fetched once at startup — rotation requires server restart | ❌ |
| Concurrent login on multiple devices | Supported (Supabase handles multiple sessions) | ✅ |
| Token in URL (leaked via referrer) | Not handled server-side | ❌ |

---

## Known Limitations

- User sync from Supabase to Prisma relies entirely on a database trigger — no fallback mechanism.
- JWKS keys fetched once at server startup; key rotation requires server restart.
- No server-side registration or login endpoints — all auth logic is client-side.
- No IP-based rate limiting on login attempts (only per-user rate limiting exists).
- OAuth flow is not tested or verified in server-side code.
- `PasswordResetToken` table exists but is used for custom reset flow, not Supabase's built-in flow.

---

## Files Inspected

```
server/src/middlewares/auth.ts
server/src/middlewares/accountStatus.ts
server/src/middlewares/rateLimiter.ts
server/src/utils/jwt.ts
server/src/modules/auth/auth.service.ts
server/src/modules/auth/auth.repository.ts
server/src/modules/auth/auth.types.ts
server/src/modules/auth/reset-password.service.ts
server/src/modules/auth/reset-password.routes.ts
server/src/config/env.ts
server/prisma/schema.prisma
client/src/modules/auth/store/useAuthStore.ts
client/src/modules/auth/hooks/useAuth.ts
client/src/modules/auth/schemas/auth.ts
client/src/modules/auth/components/LoginForm.tsx
client/src/modules/auth/components/RegisterForm.tsx
client/src/modules/auth/components/ForgotPasswordForm.tsx
client/src/modules/auth/components/ResetPasswordForm.tsx
client/src/shared/providers/auth-provider.tsx
client/src/shared/providers/AuthGate.tsx
client/src/app/auth/callback/page.tsx
```
