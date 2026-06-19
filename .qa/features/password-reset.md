# Feature: Forgot/Reset Password

## Positive Tests
- [ ] "Forgot password?" link visible on login form
- [ ] Entering email triggers Supabase password reset email
- [ ] Reset password page shows after clicking email link
- [ ] Can enter new password with visibility toggle
- [ ] Password confirmation field must match
- [ ] On success, user is redirected to login
- [ ] Can log in with new password

## Negative Tests
- [ ] Invalid email format rejected
- [ ] Password too short (< 8 chars) rejected
- [ ] Passwords must match
- [ ] Expired reset link shows error state
- [ ] Already-used reset link shows error

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state during submission
- [ ] Success state with confirmation message
- [ ] Error state for invalid/expired links
- [ ] Dark mode

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
