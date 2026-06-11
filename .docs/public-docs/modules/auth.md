# Auth Module

## Overview

The Auth module handles user identification, session management, and route protection. Nexus uses **Supabase Auth** for authentication, with session state managed by the Supabase SDK on the client and JWKS-based token verification on the server.

## Architecture

```
┌─────────────┐     JWT Token     ┌──────────────┐
│  Supabase   │◄──────────────────►│   Client     │
│   Auth      │    (Cookie/SDK)   │  (Next.js)   │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ DB Trigger                       │ Bearer JWT
       ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│  PostgreSQL  │◄─────────────────│    Server     │
│  (Prisma)    │   Prisma Queries │  (Express)    │
└──────────────┘                  └──────────────┘
```

## Client-Side (`client/src/modules/auth`)

### Key Files

| File | Role |
|---|---|
| `hooks/useAuth.ts` | Login, register, GitHub OAuth, logout with loading/error states |
| `schemas/auth.ts` | Zod schemas with password complexity rules (min 8 chars, 1 uppercase, 1 number, 1 special) |
| `store/useAuthStore.ts` | Zustand store for current user state (used across the app) |
| `components/LoginForm.tsx` | Login form with contextual redirects and email confirmation banners |
| `components/RegisterForm.tsx` | Registration form |
| `components/AuthSidebar.tsx` | Auth page decorative sidebar |
| `components/MobileAuthHeader.tsx` | Mobile responsive auth header |

### Shared Utilities

| File | Role |
|---|---|
| `shared/lib/supabase.ts` | Supabase browser client (`createBrowserClient` from `@supabase/ssr`) |
| `shared/lib/api.ts` | Axios instance with JWT interceptor and 401 auto-redirect |
| `shared/providers/auth-provider.tsx` | Auth context provider wrapping the app |
| `shared/providers/AuthGate.tsx` | Blocks rendering until auth state is resolved |

### Route Protection

- **Edge Middleware** (`client/src/proxy.ts`): Protects `/conversations` routes. Redirects authenticated users away from `/login` and `/register`. Uses `createServerClient` from `@supabase/ssr`.

## Server-Side (`server/src/middlewares/auth.ts`)

The auth middleware:
1. Extracts the Bearer token from the `Authorization` header
2. Fetches and caches Supabase JWKS public keys on startup (using `jose` library)
3. Performs local ES256 cryptographic verification (zero network calls at runtime)
4. Upserts the user into the Prisma `User` table if not already present
5. Attaches the user object to `req.user`

### Database Trigger Sync

Supabase Auth users are synced to the Prisma `User` table via a database trigger defined in `server/prisma/SUPABASE_QUERIES.sql`:

- **Trigger:** `on_auth_user_created` on `auth.users`
- **Function:** `handle_new_user()` — inserts into `public.User`
- **Field mapping:**
  - `id` → `raw_user_meta_data.id` (Supabase Auth UID)
  - `email` → `raw_user_meta_data.email`
  - `username` → `raw_user_meta_data.username` (falls back to email prefix)
  - `avatar_url` → `raw_user_meta_data.avatar_url`

## Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/me` | Yes | Returns the current Prisma user for a valid Supabase JWT |
| `GET` | `/api/users` | Yes | List all registered users |
| `GET` | `/api/users/search?q=` | Yes | Search users by username/email |

## Explicit Non-Goals

- Do not create `POST /api/auth/sync` — the Supabase trigger handles user sync
- Do not create `/api/auth/me` — use the existing `/api/me` route
- Do not add `server/src/lib/supabase.ts` unless Express needs Supabase Admin API calls
- Do not assume the client has network access to Supabase directly for auth — sessions flow through the Next.js proxy middleware

## Known Limitations & TODOs

- [ ] **Rate Limiting:** Implement `express-rate-limit` on auth endpoints to prevent brute-force attacks
- [ ] **Security Headers:** Add `helmet` to enforce CSP, HSTS, and X-Frame-Options
- [ ] **Reset Password UI:** Create a dedicated `/reset-password` page that listens for the `PASSWORD_RECOVERY` event
- [ ] **Sign-out Before 401 Redirect:** In `api.ts`, call `supabase.auth.signOut()` before redirecting to `/login`
