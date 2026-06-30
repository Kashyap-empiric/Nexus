# Feature: Onboarding

## Goal

Guide newly registered users through setting up their profile (full name, bio, avatar) and optionally creating their first workspace before entering the main application.

---

## Current Status

```
Implemented
```

Backend and frontend implementations are complete. New users are redirected to onboarding after registration, and already-onboarded users are redirected away from it.

---

## High-Level Summary

- Onboarding state tracked via `User.isOnboarded` boolean field.
- Multi-step wizard UI with profile setup, workspace creation, and completion steps.
- Workspace creation during onboarding reuses the same logic as normal workspace creation.
- Skipping workspace creation leaves the user without any workspace (can create later).
- Server-side slug collision handling appends random suffix to duplicate slugs.
- No server-side step progress persistence — all step state is client-side in Zustand.

---

## Code Locations

```
Backend

server/src/modules/onboarding/onboarding.service.ts   — Onboarding business logic
server/src/modules/onboarding/onboarding.controller.ts — Request handler
server/src/modules/onboarding/onboarding.routes.ts     — Route definition
server/src/modules/onboarding/onboarding.schema.ts     — Zod validation schema

Frontend

client/src/modules/onboarding/index.ts                  — Module barrel
client/src/modules/onboarding/api/onboarding.api.ts     — API client
client/src/modules/onboarding/types/onboarding.ts       — TypeScript types
client/src/modules/onboarding/components/OnboardingWizard.tsx      — Main wizard
client/src/modules/onboarding/components/SetupProfileStep.tsx      — Profile step
client/src/modules/onboarding/components/CreateWorkspaceStep.tsx   — Workspace step
client/src/modules/onboarding/components/OnboardingCompleteStep.tsx — Completion step
client/src/modules/onboarding/components/StepProgress.tsx          — Step indicator
client/src/app/(protected)/onboarding/page.tsx          — Onboarding page
client/src/app/(protected)/onboarding/layout.tsx        — Onboarding layout
```

---

## Database

- `User.isOnboarded` (Boolean, default `false`) — set to `true` after completing onboarding.
- `User.fullName`, `User.bio`, `User.avatarUrl`, `User.avatarPath` — updated during profile step.
- `Workspace`, `WorkspaceMember`, `Conversation` (#general) — created if workspace is not skipped.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/onboarding/complete` | Required | Submit onboarding data |

### Request Validation

```typescript
// server/src/modules/onboarding/onboarding.schema.ts
completeOnboardingSchema = z.object({
  fullName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  skipWorkspace: z.boolean().optional(),
  workspaceName: z.string().max(50).optional(),
  workspaceSlug: z.string().max(50).regex(/^[a-z0-9-]*$/).optional(),
  workspaceDescription: z.string().max(500).optional(),
  workspaceIconPath: z.string().optional(),
})
```

### Response

- `201` on success with `{ data: { skippedWorkspace, workspaceId, generalChannelId, workspaceSlug } }`.
- `400` on validation failure.
- `500` on internal error.

### Permissions

- Requires authentication (`authMiddleware`).
- Requires account not being deleted (`rejectDeletingAccount`).

---

## Backend Implementation

### completeOnboarding (`server/src/modules/onboarding/onboarding.service.ts`)

- Runs within a Prisma transaction.
- Updates user profile: `fullName`, `bio`, `avatarUrl`, `avatarPath`, `isOnboarded: true`.
- If `skipWorkspace` is true or workspace data is missing, returns `{ skippedWorkspace: true }`.
- If workspace creation is requested:
  - Checks for existing slug — if taken, appends random 4-char suffix.
  - Creates workspace with user as OWNER.
  - Creates #general channel.
- Dispatches `USER_PROFILE_UPDATE` socket event after completion.

---

## Frontend Implementation

### OnboardingWizard

- Zustand store (local to component) manages step state.
- Steps: SetupProfile → CreateWorkspace (optional) → Complete.
- StepProgress component shows visual step indicator.
- Calls `POST /api/onboarding/complete` with collected data.
- On success, redirects to either the new workspace or DM view.

### SetupProfileStep

- Form fields: fullName (required), bio (optional).
- Dispatches `dispatchUserProfileUpdate` on completion.

### CreateWorkspaceStep

- Fields: workspace name (required), slug (auto-generated from name).
- "Skip" button to bypass workspace creation.

### OnboardingCompleteStep

- Shows success animation and redirects.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Profile setup step | ✅ | `SetupProfileStep.tsx` |
| Workspace creation step | ✅ | `CreateWorkspaceStep.tsx` |
| Skip workspace option | ✅ | `skipWorkspace` in schema |
| Step progress indicator | ✅ | `StepProgress.tsx` |
| Server-side validation | ✅ | Zod schema in `onboarding.schema.ts` |
| Socket profile update dispatch | ✅ | `dispatchUserProfileUpdate` in controller |
| Server-side step progress | ❌ | All state is client-side in Zustand |
| Avatar upload during onboarding | ❌ | URL can be passed but no upload UI in step |
| Onboarding re-entry guard | ⚠️ | Layout checks `isOnboarded` but no forced redirect server-side |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| New user registers | Redirected to onboarding | Auth flow redirects to /onboarding | ✅ |
| Complete profile only | User marked onboarded, no workspace created | `skipWorkspace: true` returned | ✅ |
| Complete profile + workspace | Workspace + #general created | Transaction creates both | ✅ |
| Skip workspace | User enters app without workspace | `skippedWorkspace: true` | ✅ |
| Duplicate slug | Slug gets random suffix | Service appends suffix | ✅ |
| Already-onboarded user visits /onboarding | Redirected away | Layout checks `isOnboarded` | ✅ |
| Validation fails in any step | Error shown, cannot proceed | Zod validation on each field | ✅ |
| Network failure during submit | Error state with retry | Error caught in controller, 500 returned | ✅ |

---

## Current Flow

```
User registers
  ↓
Redirected to /onboarding
  ↓
Layout checks User.isOnboarded
  ↓
Not onboarded → show wizard
  ↓
Step 1: SetupProfileStep — enter fullName, bio
  ↓
Step 2: CreateWorkspaceStep — enter name/slug or skip
  ↓
POST /api/onboarding/complete
  ↓
Server transaction: update user, optionally create workspace + #general
  ↓
dispatchUserProfileUpdate broadcast
  ↓
Redirect to workspace channels or DM view
```

---

## Missing Pieces

```
□ Avatar upload component during onboarding
□ Server-side step progress persistence
□ Onboarding progress saved (page refresh loses step)
□ Email verification step before onboarding
□ Workspace template selection
□ Optional team member invitation during onboarding
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Page refresh during onboarding | Loses step progress (client-side only) | ❌ |
| Workspace slug collision | Random suffix appended | ✅ |
| User with isOnboarded=true visits /onboarding | Redirected away (layout-level check) | ✅ |
| Empty workspace name | Zod validation rejects | ✅ |

---

## Known Limitations

- Onboarding step progress is entirely client-side — page refresh resets to step 1.
- No avatar upload component exists in the onboarding flow; only URL passthrough.
- Skipping workspace creation leaves user workspace-less until they create one manually.

---

## Files Inspected

```
server/src/modules/onboarding/onboarding.service.ts
server/src/modules/onboarding/onboarding.controller.ts
server/src/modules/onboarding/onboarding.routes.ts
server/src/modules/onboarding/onboarding.schema.ts
server/prisma/schema.prisma
client/src/modules/onboarding/components/OnboardingWizard.tsx
client/src/modules/onboarding/components/SetupProfileStep.tsx
client/src/modules/onboarding/components/CreateWorkspaceStep.tsx
client/src/modules/onboarding/components/OnboardingCompleteStep.tsx
client/src/modules/onboarding/components/StepProgress.tsx
client/src/modules/onboarding/api/onboarding.api.ts
client/src/modules/onboarding/types/onboarding.ts
client/src/app/(protected)/onboarding/page.tsx
client/src/app/(protected)/onboarding/layout.tsx
```
