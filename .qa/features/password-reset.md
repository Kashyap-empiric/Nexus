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
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] Invalid email format rejected before API call
- [ ] Password too short (< 8 chars) shown inline
- [ ] Password mismatch shown inline
- [ ] Expired reset link shows friendly error
- [ ] Already-used reset link shows appropriate message

## Demo Preparation

### Demo Flow
1. Click "Forgot password?" on login form — email input shown
2. Enter email — confirmation message displayed
3. Open email and click reset link — reset password page loads
4. Enter new password with visibility toggle
5. Confirm password matches
6. Submit — redirected to login
7. Log in with new password

### Test Accounts
- Registered user account with valid email

### Expected Results
- Password reset email sent via Supabase
- Reset link validates and shows form
- Password confirmation validation works
- New password works for login
- Expired/reused links show error state

## Architecture Explanation

### Design Decisions
- Password reset uses Supabase's built-in `resetPasswordForEmail` API
- Custom server-side token verification for additional security
- `PASSWORD_RECOVERY` event handled on client to detect redirect
- 10-second timeout for link expiry detection

### Data Flow
Client (forgot form) → Supabase Auth → Email → User clicks link → Client (reset page) → PASSWORD_RECOVERY event → Server verifies token → Supabase updates password

### API Flow
- `supabase.auth.resetPasswordForEmail(email)` — triggers email
- Client-side `onAuthStateChange` listener detects `PASSWORD_RECOVERY` event
- Server-side token verification via custom reset-password routes

### Database Interactions
- `PasswordResetToken` table stores hashed tokens
- Token verified and marked used to prevent replay

### Permission Model
- Public endpoint (no auth required for forgot/reset)
- Token-based verification prevents unauthorized password changes

### Tradeoffs
- Relies on Supabase auth for email delivery (no custom email templates)
- Browser must handle the password recovery callback URL

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No custom email template for reset | Uses Supabase default template | 2026-06-19 |
| 10-second timeout for PASSWORD_RECOVERY event | Race condition in Supabase event firing | 2026-06-19 |

## AI Usage Report

### Scope
Password reset — forgot password, reset flow, token verification

### Files Modified
- ForgotPasswordForm, ResetPasswordForm (client)
- Reset password routes and service (server)
- Email service integration

### Decisions Made
- Supabase's built-in reset flow for security (battle-tested)
- Custom server token verification as extra security layer

### Risks
- Email deliverability depends on Supabase's configured SMTP
- 10-second timeout is fragile — may fail on slow connections

### Follow-up Work
- Add custom branded email template
- Replace timeout with more robust event handling

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
