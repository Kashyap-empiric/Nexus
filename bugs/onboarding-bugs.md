# Onboarding Module Bug Analysis

Covers server (`server/src/modules/onboarding/`) and the onboarding client flow (`client/src/modules/onboarding/`, `client/src/app/(protected)/onboarding/`).

**Last updated:** 2026-06-16 (Bug 12 fixed, Bug 14 added and fixed, Bug 15 added)

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

### 12. ~~Onboarding Has No "Skip" Option~~ ✅ FIXED 2026-06-16

**Status:** "Skip for now" button added to `CreateWorkspaceStep.tsx:111-119`. Server-side skip logic added to `onboarding.service.ts:19-21` (sets `isOnboarded: true` and returns `{ skippedWorkspace: true }`). Client redirects to `/conversations` on skip.

### 14. Query Key Mismatch — Stale Profile Cache After Onboarding ✅ FIXED 2026-06-16

**File:** `client/src/modules/onboarding/components/OnboardingWizard.tsx:69`

```typescript
// BEFORE (broken):
await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
// AFTER (fixed):
await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
```

The `OnboardingWizard` invalidated `["my-profile"]` but `useProfile` (`client/src/modules/users/hooks/useProfile.ts:25`) uses `["users", "me"]`. After onboarding completed, the profile cache was never invalidated → `AuthGate` read stale `isOnboarded: false` → redirected back to `/onboarding` → **infinite redirect loop**.

**Impacted every single new user.** Fixed by correcting the query key.

### 13. ~~Client-Side Avatar Upload Error Blocks Entire Onboarding~~ ✅ FIXED 2026-06-16

**File:** `client/src/modules/onboarding/components/OnboardingWizard.tsx:52-61`

**Status:** Avatar upload now wrapped in its own try-catch. On failure, a toast is shown and onboarding continues without the avatar.

### 15. `isPrivate` Default Contradicts `visibility` Default on Conversation Model

**File:** `server/prisma/schema.prisma:46-47`

```prisma
visibility ChannelVisibility @default(PUBLIC)
isPrivate  Boolean            @default(true)
```

Every new `Conversation` is created with `visibility: PUBLIC` but `isPrivate: true` by default — contradictory defaults. The onboarding service (`onboarding.service.ts:59`) hardcodes `isPrivate: false` for the `#general` channel, but any code path that doesn't explicitly set both fields creates inconsistent records.

**Impact:** Channel visibility checks that rely on `isPrivate` vs `visibility` may disagree on whether a channel is public or private, causing incorrect access decisions.
