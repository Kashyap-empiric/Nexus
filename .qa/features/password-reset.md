# Feature: Password Reset

## Goal

Allow users to request a password reset via email, verify the reset token, and set a new password securely.

---

## Current Status

```
Implemented
```

Custom password reset flow with server-side token generation, hashed tokens stored in database, email delivery via BullMQ/SendGrid, and token verification endpoints.

---

## High-Level Summary

- Custom password reset implementation (not relying on Supabase's built-in email flow).
- Tokens are 32-byte random hex, hashed with SHA-256 before storage (raw token never stored).
- Token expiry: 1 hour.
- Password update performed via Supabase Admin API (`supabase.auth.admin.updateUserById`).
- Email delivery via BullMQ `send-email` job or direct `sendPasswordResetEmail` fallback.
- Token verification endpoint (`/auth/reset-password/verify`) exists for client-side validation.
- Forgot password endpoint always returns 200 to prevent email enumeration.
- Scheduled cleanup of expired reset tokens runs daily at 3 AM.
- Separate `PasswordResetToken` table in database.

---

## Code Locations

```
Backend

server/src/modules/auth/reset-password.service.ts   — Token generation, verification, password update
server/src/modules/auth/reset-password.routes.ts    — Route definitions
server/src/lib/email.ts                             — Email service (SendGrid)
server/src/jobs/processors/sendEmail.processor.ts   — Email worker
server/src/jobs/processors/cleanup.processor.ts     — Expired token cleanup

Database

server/prisma/schema.prisma

Frontend

client/src/modules/auth/components/ForgotPasswordForm.tsx  — Forgot password form
client/src/modules/auth/components/ResetPasswordForm.tsx   — Reset password form
client/src/app/(auth)/forgot-password/page.tsx             — Forgot password page
client/src/app/(auth)/reset-password/page.tsx              — Reset password page
```
---

## Database

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
}
```

- `tokenHash` indexed for fast lookup.
- `usedAt` is null until the token is consumed.
- Cascade delete on user deletion.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| GET | `/api/auth/reset-password/verify?token=` | Public | Verify token validity |
| POST | `/api/auth/reset-password/complete` | Public | Set new password |

### Request Validation

```typescript
forgotPasswordSchema = z.object({
  email: z.string().email(),
});

completeResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
```

- Forgot password always returns 200 (`"If that email exists, a reset link has been sent."`) to prevent email enumeration.
- Verify endpoint returns `{ valid: boolean, email?: string | null }`.
- Complete endpoint returns `{ success: true }` or `{ error: string }` with 400 status.

---

## Backend Implementation

### Reset Password Service (`server/src/modules/auth/reset-password.service.ts`)

- **`generateResetToken(userId)`**:
  1. Generates 32 random bytes as hex string (raw token).
  2. Hashes raw token with SHA-256.
  3. Stores hash in `PasswordResetToken` table with 1-hour expiry.
  4. Returns raw token (to be included in email URL).
- **`verifyResetToken(token)`**:
  1. Hashes the provided token.
  2. Looks up hash in database where `usedAt IS NULL`.
  3. Checks expiry.
  4. Returns `{ userId }` or null.
- **`completePasswordReset(token, newPassword)`**:
  1. Verifies token (same as above).
  2. Updates password via Supabase Admin API (`supabase.auth.admin.updateUserById`).
  3. Marks token as used (`usedAt = new Date()`).

### Reset Password Routes (`server/src/modules/auth/reset-password.routes.ts`)

- **POST `/auth/forgot-password`**:
  1. Looks up user by email in Prisma.
  2. If user found, generates reset token and enqueues `send-email` job (or calls email service directly).
  3. Always returns 200 with generic success message.
- **GET `/auth/reset-password/verify`**:
  1. Verifies token, returns `{ valid: true, email }` or `{ valid: false }`.
- **POST `/auth/reset-password/complete`**:
  1. Validates token and new password.
  2. Calls `completePasswordReset` which updates password via Supabase Admin API.
  3. Returns success or error.

---

## Frontend Implementation

### ForgotPasswordForm (`client/src/modules/auth/components/ForgotPasswordForm.tsx`)

- Email input with Zod validation.
- Calls `POST /api/auth/forgot-password`.
- Shows success message regardless of whether email exists.

### ResetPasswordForm (`client/src/modules/auth/components/ResetPasswordForm.tsx`)

- Reads token from URL query params.
- Calls `GET /api/auth/reset-password/verify` to validate token on mount.
- New password + confirm password fields with visibility toggle.
- Calls `POST /api/auth/reset-password/complete`.
- On success, redirects to login page.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Token generation | ✅ | `generateResetToken` in service |
| Hash-based token storage | ✅ | SHA-256 hash stored, raw token returned |
| Token verification endpoint | ✅ | `GET /auth/reset-password/verify` |
| Password update via Supabase Admin | ✅ | `supabase.auth.admin.updateUserById` |
| Email delivery via BullMQ | ✅ | `send-email` job |
| Email fallback (no BullMQ) | ✅ | Direct `sendPasswordResetEmail` call |
| Token expiry (1 hour) | ✅ | `TOKEN_EXPIRY_MS = 60 * 60 * 1000` |
| Mark token as used | ✅ | `usedAt = new Date()` after completion |
| Scheduled cleanup of expired tokens | ✅ | BullMQ scheduled job at 3 AM |
| Email enumeration prevention | ✅ | Always returns 200 |
| Custom email template | ❌ | SendGrid default template |
| Rate limiting on forgot-password | ❌ | No rate limiter applied |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Valid email entered | Reset email sent, 200 returned | Token generated, email queued, 200 returned | ✅ |
| Invalid email entered | 200 returned (no info leak) | Always returns 200 | ✅ |
| Non-existent email entered | 200 returned (no info leak) | Always returns 200 | ✅ |
| User clicks valid reset link | Reset form shown | Token verified via verify endpoint | ✅ |
| User clicks expired reset link | Error state shown | verify returns `{ valid: false }` | ✅ |
| User clicks used reset link | Error state shown | `usedAt IS NULL` filter rejects | ✅ |
| Submit valid new password | Password updated, redirected to login | `completePasswordReset` calls Supabase Admin API | ✅ |
| Submit weak password (< 8 chars) | Zod validation error | `min(8)` in schema | ✅ |
| Submit mismatched confirmation | Client-side error | Handled in ResetPasswordForm | ✅ |
| BullMQ unavailable | Email sent directly | Fallback to direct `sendPasswordResetEmail` | ✅ |

---

## Current Flow

```
Forgot password:
  User enters email → POST /api/auth/forgot-password
  → User lookup (silent fail if not found)
  → generateResetToken(user.id) → SHA-256 hash → store in DB
  → Enqueue send-email job (or direct send)
  → Email with reset link sent
  → Return 200 "If that email exists, a reset link has been sent."

Reset password:
  User clicks link → page loads with ?token=xxx
  → GET /api/auth/reset-password/verify?token=xxx
  → verifyResetToken → hash token → find in DB → check expiry
  → Return { valid: true/false }
  → If valid, show form → user enters new password
  → POST /api/auth/reset-password/complete
  → completePasswordReset:
    1. Verify token again
    2. Update password via Supabase Admin API
    3. Mark token as used
  → Redirect to login
```

---

## Missing Pieces

```
□ Rate limiting on forgot-password endpoint
□ Custom branded email template for password reset emails
□ IP logging for password reset attempts
□ Password history (prevent reuse of last N passwords)
□ Email notification when password is changed
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Non-existent email | No token generated, 200 returned | ✅ |
| Expired token | `verifyResetToken` returns null | ✅ |
| Already-used token | `usedAt IS NULL` filter prevents reuse | ✅ |
| Concurrent password reset with same token | First complete wins, second fails | ✅ |
| SendGrid API key missing | Email returns `EMAIL_NOT_CONFIGURED` error | ✅ |
| Supabase Admin API failure | Error thrown with message | ✅ |
| Token leaked in URL (referrer) | Not mitigated | ❌ |

---

## Known Limitations

- No rate limiting on forgot-password endpoint (could be abused for email spam).
- Email template uses SendGrid default — no custom branding.
- Token is included in URL query parameter — could be leaked via referrer headers.
- No password history check — users can reuse the same password.
- No email verification during registration (separate from password reset).

---

## Files Inspected

```
server/src/modules/auth/reset-password.service.ts
server/src/modules/auth/reset-password.routes.ts
server/src/lib/email.ts
server/src/jobs/processors/sendEmail.processor.ts
server/src/jobs/processors/cleanup.processor.ts
server/src/jobs/workers.ts
server/prisma/schema.prisma
client/src/modules/auth/components/ForgotPasswordForm.tsx
client/src/modules/auth/components/ResetPasswordForm.tsx
client/src/app/(auth)/forgot-password/page.tsx
client/src/app/(auth)/reset-password/page.tsx
```
