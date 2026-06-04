# Authentication Module

> **Last Updated:** 2026-06-04

## Overview

The Authentication module in Nexus provides end-to-end identity management, session handling, and route protection. It leverages **Supabase Auth** for the heavy lifting (token issuance, OAuth, password resets) while maintaining a strict, secure boundary between the Next.js client and the Express backend.

## Architecture

The auth architecture relies on a decoupled approach where the client handles session cookies and the server verifies them cryptographically without making network calls.

### 1. Client-Side (Next.js)

- **Supabase SSR:** The client uses `@supabase/ssr` to manage sessions via cookies. This ensures that the Next.js server (including Middleware and Server Components) can securely read the user's session.
- **Edge Middleware (`client/src/middleware.ts`):** 
  - Runs at the edge before any request is processed.
  - **Protected Routes:** Redirects unauthenticated users trying to access `/conversations/*` to `/login`.
  - **Auth Routes:** Redirects already authenticated users trying to access `/login` or `/register` to `/conversations`.
- **Global API Interceptor (`client/src/lib/api.ts`):** 
  - Automatically attaches the Bearer token to all outgoing Axios requests.
  - Catches any `401 Unauthorized` responses from the server and performs a hard redirect (`window.location.href = "/login"`) to clear state and caches.
- **TanStack Query Config (`query-provider.tsx`):** Disables automatic retries on `4xx` errors (client errors/auth failures) to prevent redundant network calls when a token is invalid.

### 2. Server-Side (Express)

- **Local JWKS Verification (`server/src/middlewares/auth.ts`):**
  - Instead of calling `supabase.auth.getUser()` on every request (which incurs a network round-trip), the server fetches the Supabase public key set (JWKS) once on startup.
  - It uses the `jose` library to cryptographically verify the JWT (ES256) locally. This results in **zero network overhead** for protected routes.
- **Automatic User Upsert:**
  - Upon successful JWT verification, the auth middleware automatically upserts the user into the Prisma PostgreSQL database (`User` table).
  - This ensures that users who sign in via OAuth (e.g., GitHub) have a corresponding row in the local database immediately on their first API request, preventing 404 errors on endpoints like `/api/me`.

## Key Files

| File | Purpose |
|---|---|
| `client/src/middleware.ts` | Edge route protection and auth redirects. |
| `client/src/lib/supabase.ts` | Browser client initialization. |
| `client/src/hooks/useAuth.ts` | React hooks for login, register, OAuth, and logout. |
| `client/src/schemas/auth.ts` | Zod schemas with strict password complexity (min 8 chars, upper, number, special). |
| `client/src/lib/api.ts` | Axios instance with 401 response interceptor. |
| `server/src/middlewares/auth.ts` | Express middleware for ES256 JWKS JWT verification and Prisma DB sync. |

## Flows

### OAuth Sign-In
1. User clicks "Sign in with Github".
2. Browser navigates to GitHub, then redirects to `client/src/app/auth/callback/page.tsx`.
3. The callback page uses a `useRef` guard to prevent double-navigation race conditions.
4. User is redirected to `/conversations`.
5. On the first API request, `server/src/middlewares/auth.ts` intercepts the request, verifies the token, and creates the `User` row in Postgres.

### Password Reset
1. User requests a reset at `/forgot-password`.
2. Supabase sends an email.
3. *Current Limitation:* The link directs to `/auth/callback` which handles the login but does not yet provide a UI to enter a new password. A dedicated `/reset-password` page is needed.
