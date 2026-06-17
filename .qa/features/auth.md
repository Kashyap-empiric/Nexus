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

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
