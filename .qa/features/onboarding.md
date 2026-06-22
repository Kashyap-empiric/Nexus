# Feature: Onboarding

## Positive Tests
- [ ] Newly registered user sees onboarding flow
- [ ] Can set profile (full name, bio, avatar)
- [ ] Can create first workspace
- [ ] Can skip workspace creation
- [ ] After onboarding, user lands on workspace or DM view

## Negative Tests
- [ ] Cannot proceed without required fields
- [ ] Cannot proceed with invalid workspace slug
- [ ] Already-onboarded users are not shown onboarding again

## API Verification
- [ ] Workspace creation returns 201
- [ ] Profile update returns 200

## Database Verification
- [ ] User profile updated with fullName and bio
- [ ] Workspace created with #general channel

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state during workspace creation
- [ ] Error state for failed creation
- [ ] Step indicator works correctly
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] Workspace slug collision shows clear error
- [ ] Network failure during onboarding shows retry option

## Demo Preparation

### Demo Flow
1. Register a new user — redirected to onboarding
2. Set profile (fullName, bio) — step completes
3. Create first workspace — workspace + #general created
4. Skip workspace creation — lands on DM view
5. Verify re-entering onboarding shows existing data

### Test Accounts
- Freshly registered user (not yet onboarded)
- Already-onboarded user (should not see onboarding)

### Expected Results
- New users see multi-step wizard
- Profile fields pre-populate if data exists
- Workspace creation creates #general channel
- Skipping workspace creation shows DM view
- Already-onboarded users redirect to main app

## Architecture Explanation

### Design Decisions
- Onboarding state tracked via `User.isOnboarded` boolean
- Multi-step wizard with Zustand store for step navigation
- Workspace creation reuses workspace service (no duplicate code)

### Data Flow
Client → REST → Controller → Service → User update + Workspace create (if applicable)

### API Flow
- `PATCH /api/users/me` — update profile
- `POST /api/workspaces` — create first workspace

### Database Interactions
- `User.isOnboarded` set to true after completion
- `Workspace` + `WorkspaceMember` + `Conversation` (#general) created

### Permission Model
- All routes protected by auth middleware
- Onboarding check in layout to redirect already-onboarded users

### Tradeoffs
- Workspace creation during onboarding uses same endpoint as normal flow
- No forced step order enforcement server-side

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No onboarding progress saved server-side | All state managed client-side in Zustand | 2026-06-16 |
| Skipping workspace creation leaves user workspace-less | User can always create later | 2026-06-16 |

## AI Usage Report

### Scope
Onboarding flow — multi-step wizard for new users

### Files Modified
- Onboarding components, steps (client)
- User profile update API (server)

### Decisions Made
- Client-side Zustand store for step progression
- Reuses existing workspace creation endpoint

### Risks
- Page refresh during onboarding loses step progress

### Follow-up Work
- Add server-side onboarding progress persistence
- Add optional avatar upload during onboarding

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
