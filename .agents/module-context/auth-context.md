# Auth Module Context

> **Last Updated:** 2026-06-09
> **Status:** Phase 1 Core Implemented

## Module Overview
The Auth flow spans Next.js, Express, Supabase Auth, and a Supabase database trigger. Supabase Auth owns registration/login/OAuth/session management, the client SDK manages browser sessions, and Express protects API routes through local JWKS verification. User sync into Prisma is handled by the Supabase trigger in `server/prisma/SUPABASE_QUERIES.sql`; do not add custom sync endpoints.

## Key Files & Responsibilities

### Client Side
- **`client/src/lib/supabase.ts`**: Initializes the Supabase browser client (`createBrowserClient` from `@supabase/ssr`). Handles cookie-based sessions.
- **`client/src/proxy.ts`**: Next.js Edge Middleware. Secures `/conversations` routes and redirects authenticated users away from `/login` and `/register`. Uses `createServerClient`.
- **`client/src/modules/auth/hooks/useAuth.ts`**: Custom React hook managing login, registration, GitHub OAuth, and logout. Handles loading states and error formatting. 
- **`client/src/modules/auth/schemas/auth.ts`**: Zod schemas for forms. Enforces strict password complexity (min 8 chars, 1 uppercase, 1 number, 1 special).
- **`client/src/modules/auth/components/*`**: UI components for authentication.
  - `LoginForm.tsx`: Handles standard login and contextual redirects (e.g., email confirmation banners).
  - `RegisterForm.tsx`: Handles user signup.
- **`client/src/app/(auth)/*`**:
  - `forgot-password/page.tsx`: Handles triggering the password reset email flow.
- **`client/src/app/auth/callback/page.tsx`**: Resolves OAuth redirects and uses a `useRef` guard to prevent double-navigation race conditions.
- **`client/src/shared/lib/api.ts`**: Axios instance containing a global response interceptor. Automatically redirects to `/login` if any API request returns `401 Unauthorized`.
- **`client/src/providers/query-provider.tsx`**: TanStack Query config disabling automatic retries for `4xx` errors to prevent redundant auth-failure requests.
- **Supabase trigger metadata contract**: Registration sends `username` in Supabase Auth metadata; the trigger writes it into `public.User.username`.

### Server Side
- **`server/src/middlewares/auth.ts`**: The core API protection layer.
  - Fetches the Supabase JWKS endpoint (`/.well-known/jwks.json`) on startup and caches it using the `jose` library.
  - Intercepts requests, extracts the Bearer token, and performs a local, zero-network-call ES256 cryptographic verification.
- **`server/prisma/SUPABASE_QUERIES.sql`**: Defines `handle_new_user()` and the `on_auth_user_created` trigger.
  - Inserts new Supabase Auth users into `public.User`.
  - Maps `raw_user_meta_data.username` to `User.username`, falling back to the email prefix.
  - Maps `raw_user_meta_data.avatar_url` to `User.avatarUrl`.
- **`server/src/app.ts`**: Exposes `GET /api/me`, which returns the current Prisma user for a valid Supabase JWT.

## Explicit Non-Goals
- Do not create `POST /api/auth/sync`; Supabase trigger-based sync is the source of truth.
- Do not create `/api/auth/me` unless the existing `/api/me` route is intentionally refactored.
- Do not add `server/src/lib/supabase.ts` unless Express needs Supabase Admin/API calls beyond JWKS verification.

## Known Limitations & TODOs
- [ ] **Rate Limiting:** Implement `express-rate-limit` on the Express backend to prevent brute-force attacks on auth endpoints.
- [ ] **Security Headers:** Add `helmet` to the Express backend to enforce CSP, HSTS, and X-Frame-Options.
- [ ] **Reset Password Page:** Create a dedicated `/reset-password` page on the client that listens for the `PASSWORD_RECOVERY` event. Currently, the forgot-password email sends successfully, but the user is redirected to the `/conversations` page without a UI to enter a new password.
- [ ] **Sign Out before 401 Redirect:** In `client/src/shared/lib/api.ts`, explicitly call `supabase.auth.signOut()` before performing `window.location.href = "/login"` to ensure the cookie is cleared.
