# Feature: Authentication

## Positive Tests
- [ ] Can register with email + password
- [ ] Can log in with valid credentials
- [ ] Can log in with GitHub OAuth
- [ ] Session persists on page refresh
- [ ] Can log out
- [ ] Forgot password flow triggers email

## Negative Tests
- [ ] Cannot register with weak password (< 8 chars, no uppercase, no number, no special)
- [ ] Cannot register with duplicate email
- [ ] Cannot log in with wrong password
- [ ] Cannot access protected routes without auth (redirects to /login)

## API Verification
- [ ] `GET /api/me` returns 200 with valid JWT
- [ ] `GET /api/me` returns 401 without token
- [ ] 401 response triggers redirect to /login

## Database Verification
- [ ] New user creates row in Prisma User table (via Supabase trigger)
- [ ] Username synced from auth metadata

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state during login/register
- [ ] Error state for invalid credentials
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 401 errors redirect to /login
- [ ] API 500 errors show generic error (no stack trace leaked)
- [ ] Network failures handled gracefully

## Demo Preparation

### Demo Flow
1. Navigate to /login — form renders correctly
2. Register with email + password — redirected to onboarding
3. Log out, log back in — session persists
4. Test "Forgot password" flow — email sent

### Test Accounts
- Fresh registration account for testing full flow
- Existing account for login persistence test

### Expected Results
- Registration creates user and redirects to onboarding
- Login persists across page refresh
- Password reset email triggers successfully

## Architecture Explanation

### Design Decisions
- Supabase Auth handles OAuth and session lifecycle; server verifies JWT locally via JWKS (zero network calls per request)
- User sync from Supabase to Prisma via database trigger (no custom sync endpoint)

### Data Flow
Client → Supabase Auth → JWT → Express middleware (local JWKS verification) → Prisma User

### API Flow
- `GET /api/me` — returns current user for any valid JWT
- Supabase SSR cookies manage browser sessions

### Database Interactions
- `public.User` created via Supabase `on_auth_user_created` trigger
- No direct server-side auth DB writes

### Permission Model
- Auth middleware protects all API routes except public endpoints (invite info, username check)

### Tradeoffs
- Local JWKS verification eliminates 50–200ms per request vs remote Supabase `getUser()` calls
- Relies on Supabase trigger for user sync — trigger failures could desync auth.users from public.User

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No brute-force protection on login endpoint | Requires rate limiting per-IP (currently per-user) | 2026-06-09 |
| Session invalidation on password change not tested | Supabase handles this but integration not verified | 2026-06-09 |

## AI Usage Report

### Scope
Authentication module — login, register, OAuth, session management, password reset

### Files Modified
- Auth components, hooks, store (client)
- Auth middleware (server)
- Auth routes and services (server)

### Decisions Made
- JWKS fetched on server startup and cached for zero-latency token verification
- Password reset uses Supabase's built-in email flow rather than custom email generation

### Risks
- Supabase trigger is the single point of user sync — no fallback mechanism

### Follow-up Work
- Add IP-based rate limiting for login attempts
- Add session revocation endpoint

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
