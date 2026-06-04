# Auth Module Context

> **Last Updated:** 2026-06-04
> **Status:** Phase 1 Core Implemented

## Module Overview
The Auth module provides end-to-end authentication for Nexus, spanning Next.js, Express, and Supabase. It uses Supabase Auth for identity management, handles OAuth (GitHub), and enforces route protection via Edge Middleware on the client and JWKS local verification on the server.

## Key Files & Responsibilities

### Client Side
- **`client/src/lib/supabase.ts`**: Initializes the Supabase browser client (`createBrowserClient` from `@supabase/ssr`). Handles cookie-based sessions.
- **`client/src/middleware.ts`**: Next.js Edge Middleware. Secures `/conversations` routes and redirects authenticated users away from `/login` and `/register`. Uses `createServerClient`.
- **`client/src/hooks/useAuth.ts`**: Custom React hook managing login, registration, GitHub OAuth, and logout. Handles loading states and error formatting. 
- **`client/src/schemas/auth.ts`**: Zod schemas for forms. Enforces strict password complexity (min 8 chars, 1 uppercase, 1 number, 1 special).
- **`client/src/app/(auth)/*`**: UI components for authentication.
  - `LoginForm.tsx`: Handles standard login and contextual redirects (e.g., email confirmation banners).
  - `RegisterForm.tsx`: Handles user signup.
  - `forgot-password/page.tsx`: Handles triggering the password reset email flow.
- **`client/src/app/auth/callback/page.tsx`**: Resolves OAuth redirects and uses a `useRef` guard to prevent double-navigation race conditions.
- **`client/src/lib/api.ts`**: Axios instance containing a global response interceptor. Automatically redirects to `/login` if any API request returns `401 Unauthorized`.
- **`client/src/components/providers/query-provider.tsx`**: TanStack Query config disabling automatic retries for `4xx` errors to prevent redundant auth-failure requests.

### Server Side
- **`server/src/middlewares/auth.ts`**: The core API protection layer.
  - Fetches the Supabase JWKS endpoint (`/.well-known/jwks.json`) on startup and caches it using the `jose` library.
  - Intercepts requests, extracts the Bearer token, and performs a local, zero-network-call ES256 cryptographic verification.
  - Automatically **upserts** the authenticated user into the Prisma PostgreSQL database upon a successful token check, ensuring OAuth users are synced with the local DB without needing dedicated webhook infrastructure.

## Known Limitations & TODOs
- [ ] **Rate Limiting:** Implement `express-rate-limit` on the Express backend to prevent brute-force attacks on auth endpoints.
- [ ] **Security Headers:** Add `helmet` to the Express backend to enforce CSP, HSTS, and X-Frame-Options.
- [ ] **Reset Password Page:** Create a dedicated `/reset-password` page on the client that listens for the `PASSWORD_RECOVERY` event. Currently, the forgot-password email sends successfully, but the user is redirected to the `/conversations` page without a UI to enter a new password.
- [ ] **Sign Out before 401 Redirect:** In `client/src/lib/api.ts`, explicitly call `supabase.auth.signOut()` before performing `window.location.href = "/login"` to ensure the cookie is cleared.
