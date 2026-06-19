# Feature: Users & Profiles

## Positive Tests
- [ ] Can view own profile via settings
- [ ] Can update fullName, bio, username
- [ ] Can upload avatar with preview
- [ ] Can delete avatar
- [ ] Can set user status (Available, Away, DND, Invisible)
- [ ] Can set custom status text
- [ ] User search returns results by username
- [ ] Username availability check works (debounced)
- [ ] Public profile page shows for other users
- [ ] Status selector shows in sidebar footer

## Negative Tests
- [ ] Cannot set duplicate username (409 error)
- [ ] Cannot search for self
- [ ] Cannot upload non-image file as avatar
- [ ] Avatar URL validation prevents malicious URLs
- [ ] Status text max length enforced (100 chars)

## API Verification
- [ ] `GET /api/users/me` returns 200 with full profile
- [ ] `PATCH /api/users/me` returns 200 on update
- [ ] `PATCH /api/users/me/avatar` returns 200
- [ ] `PATCH /api/users/me/status` returns 200
- [ ] `GET /api/users/search?q=` returns 200 with results
- [ ] `GET /api/users/check-username?username=` returns 200
- [ ] `GET /api/users/:id` returns 200 with public profile

## Database Verification
- [ ] User profile updated correctly
- [ ] Avatar path extracted and stored
- [ ] Status enum values stored correctly

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state during profile fetch
- [ ] Saving state during profile update
- [ ] Empty state (no bio, no avatar)
- [ ] Error state for duplicate username
- [ ] Dark mode

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
