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

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
