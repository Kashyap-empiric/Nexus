# Onboarding Module Bug Analysis

Covers server (`server/src/modules/onboarding/`) and the onboarding client flow (`client/src/modules/onboarding/`, `client/src/app/(protected)/onboarding/`).

**Last updated:** 2026-06-16

---

## CRITICAL BUGS

### 1. ~~Onboarding Routes Registered But Service Imports Non-Existent Module~~ ✅ FIXED

**Status:** Code now imports from `@/lib/transaction.js` (which exists at `server/src/lib/transaction.ts`). Routes are correctly registered at `server/src/app.ts:52`.

### 2. ~~Onboarding Service Uses Non-Existent `generateId` Utility~~ ✅ FIXED

**Status:** Code now uses `uuidv7` directly from the npm package (`server/src/modules/onboarding/onboarding.service.ts:2`). No custom ID utility is needed.

### 3. ~~No User Record Exists to Update — Prisma `update` Throws `RecordNotFound`~~ ✅ NOT A BUG

**Status:** The Supabase database trigger `on_auth_user_created` (`SUPABASE_QUERIES.sql:1-33`) is already deployed and creates the Prisma User record synchronously when a user signs up via Supabase Auth. The trigger runs `AFTER INSERT ON auth.users` and inserts into `public."User"` with `id`, `email`, `username`, and `avatarUrl`.

The trigger maps `raw_user_meta_data->>'username'` to `User.username` (falls back to email prefix if missing). **The registration code at `useAuth.ts:44` only passes `username` in metadata — `fullName` is not forwarded** (see auth-bugs.md Bug 4), but this is a separate UX concern, not a blocking bug.

---

## HIGH BUGS

### 4. ~~Cannot Handle Multipart FormData — No File Upload Middleware~~ ✅ NOT A BUG

**Status:** The client uploads avatar files to Supabase Storage client-side via `@/shared/lib/upload.ts` before calling the API. The API receives `avatarPath` as a pre-uploaded path string, matching the Zod schema. The avatar upload is fully functional — no server-side multipart handling needed.

### 5. Zod Schema Error Handling Not Standardized

**File:** `server/src/modules/onboarding/onboarding.schema.ts:1`

The schema import (`zod`) works fine. However, the controller uses `validationResult.error.format()` at line 13 for error formatting, which produces a different shape than the `validate` middleware used by other modules. This causes inconsistent error response formats.

---

## MEDIUM BUGS

### 6. Slug Collision Handling Creates Ugly Unpredictable Slugs

**File:** `server/src/modules/onboarding/onboarding.service.ts:24-25`

```typescript
if (existingWorkspace) {
  finalSlug = `${data.workspaceSlug}-${Math.floor(Math.random() * 10000)}`;
}
```

When the desired slug is taken, a random 4-digit suffix is appended. This:
- Creates ugly slugs like `myworkspace-4832`
- Can still collide (1 in 10,000 chance if the suffixed slug also exists)
- Gives the user no control over the final slug
- Is not communicated back to the UI — the user sees their workspace with a different slug than what they typed

**Better approach:** Append a short hash of `userId` + `slug`, let the user choose a different slug, or return a conflict error.

### 7. `dispatchUserProfileUpdate` Called Outside Transaction

**File:** `server/src/modules/onboarding/onboarding.controller.ts:19-20`

```typescript
dispatchUserProfileUpdate(userId);
res.status(201).json({ data: result });
```

The socket dispatch is called **before** `res.json()`. If the socket dispatch throws (e.g., IO error), the response is never sent and the client gets a hanging request. The controller's catch block catches this, but the timing is fragile — the socket emission should happen after the response or be wrapped in a try-catch independent of the main business logic.

### 8. No Zod Validation Via `validate` Middleware

**File:** `server/src/modules/onboarding/onboarding.routes.ts:9`

```typescript
router.post("/complete", onboardingController.completeOnboarding);
```

The route uses `safeParse` _inside_ the controller instead of the standard `validate` middleware pattern used by other modules:
```typescript
router.post("/complete", validate(completeOnboardingSchema), onboardingController.completeOnboarding);
```

This means:
- Inconsistent error response format compared to other endpoints
- The controller has mixed responsibilities (validation + business logic)
- If validation fails, the error details format differs from other validated endpoints

### 9. No Rate Limiting on Onboarding Endpoint

**File:** `server/src/modules/onboarding/onboarding.routes.ts:9`

The `/onboarding/complete` endpoint has no rate limiting. A user could spam this endpoint to:
- Repeatedly attempt to create workspaces (though the transaction would mostly fail)
- Generate excessive DB writes via `dispatchUserProfileUpdate` socket events

### 10. Controller Error Response Inconsistent With Rest of Codebase

**File:** `server/src/modules/onboarding/onboarding.controller.ts:13`

```typescript
res.status(400).json({ error: "Validation failed", details: validationResult.error.format() });
```

Uses `.format()` (nested object) while other controllers using `validate` middleware return `{ error: string, details: ZodIssue[] }` (flat array). Inconsistent shapes make client-side error handling fragile.

### 11. `completeOnboarding` Service Directly Accesses Prisma Client

**File:** `server/src/modules/onboarding/onboarding.service.ts:3`

The service imports `runTransaction` from `@/lib/transaction.js` and calls `prisma.$transaction(fn)` inline. This bypasses the repository pattern used by other modules (e.g., users, workspaces), making the code less testable and coupling business logic directly to the ORM.

---

## MINOR BUGS

### 12. Onboarding Has No "Skip" Option

If the user wants to skip onboarding, there's no path forward. The `AuthGate.tsx:23` redirects:
```typescript
if (!profile.isOnboarded && !isOnboardingRoute) {
  router.push('/onboarding');
}
```

This creates a redirect loop: any page → `/onboarding` → cannot leave until form is submitted. If onboarding fails (due to Bug 3), the user is **stuck** in an infinite redirect loop with no way to use the app.

### 13. Client-Side Avatar Upload Not Always Sent

**File:** `client/src/modules/onboarding/components/OnboardingWizard.tsx:52-55`

```typescript
if (profileData.avatarFile && user?.id) {
  const { uploadAvatar } = await import("@/shared/lib/upload");
  avatarPath = await uploadAvatar(user.id, profileData.avatarFile);
}
```

The avatar upload happens as a dynamic `import()` inside the submit handler. If `uploadAvatar` fails, the entire onboarding submission fails because the error is not caught independently — the error propagates to the parent catch block at line 72, preventing workspace creation even though the avatar is optional.
