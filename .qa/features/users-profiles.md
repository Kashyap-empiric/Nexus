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
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 409 for duplicate username shown correctly
- [ ] Avatar upload validation rejects non-images
- [ ] Status text max length enforced (100 chars)

## Demo Preparation

### Demo Flow
1. Open settings/profile — current data loaded
2. Update fullName and bio — saved successfully
3. Upload avatar — preview updates
4. Delete avatar — reverts to default
5. Change status to DND with custom text — updates in real-time
6. Search for another user by username

### Test Accounts
- User with complete profile (avatar, bio, custom status)
- Fresh user with no bio/avatar (for empty state)

### Expected Results
- Profile updates persist on refresh
- Avatar upload shows immediate preview
- Status updates broadcast via socket
- Username availability check is debounced
- User search returns matching results

## Architecture Explanation

### Design Decisions
- Avatar uploads stored in Supabase Storage, URL stored in User model
- Status enum (AVAILABLE, AWAY, DND, INVISIBLE) enforced at DB level
- Username availability check is public (no auth required)

### Data Flow
Client → REST → Controller → Service → Prisma → PostgreSQL + Socket dispatcher (for status updates)

### API Flow
- `GET /api/users/me` — full profile
- `PATCH /api/users/me` — update profile
- `PATCH /api/users/me/avatar` — update avatar
- `PATCH /api/users/me/status` — update presence status
- `GET /api/users/search?q=` — search users
- `GET /api/users/check-username?username=` — availability check

### Database Interactions
- `User` table: avatarUrl, bio, status, statusText fields
- Username unique constraint enforced at DB level

### Permission Model
- Profile update: only self
- Public profile: any authenticated user
- Username check: unauthenticated (for registration form)
- Search: any authenticated user

### Tradeoffs
- Avatar stored as URL (not file) — requires upload to Supabase Storage first
- No avatar crop/resize — client responsible for image preparation

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No avatar crop/resize on upload | Requires client-side image processing | 2026-06-15 |
| No batch user import | Out of scope for MVP | 2026-06-15 |

## AI Usage Report

### Scope
Users & profiles — profile CRUD, avatar, status, search

### Files Modified
- Profile components, hooks (client)
- User routes, controller, service (server)

### Decisions Made
- Supabase Storage for avatars (reuses existing infra)
- Status enum for type-safe presence management

### Risks
- No avatar moderation — users can upload any image

### Follow-up Work
- Add avatar crop/resize
- Add admin user management panel

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
