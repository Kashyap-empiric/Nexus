# User Profiles — Implementation Plan & Record

> **Status:** Implemented ✅
> **Last updated:** 2026-06-16

---

## Existing Infrastructure Audit

### What Exists

| Asset | Location | Status | Notes |
|---|---|---|---|
| `User` model | `server/prisma/schema.prisma` | ✅ | Extended with `fullName`, `bio`, `status`, `statusText`, `avatarPath` |
| `findUserById` | `server/src/modules/users/users.repository.ts` | ✅ | Returns full user record, including new profile fields |
| `UserAvatar` component | `client/src/shared/components/ui/user-avatar.tsx` | ✅ | Updated to handle `avatarPath` via Supabase public URLs |
| `PresenceIndicator` | `client/src/modules/chat/components/PresenceIndicator.tsx` | ✅ | Updated to reflect user `status` (green for AVAILABLE, yellow for AWAY, red for DND, gray for offline/INVISIBLE) |
| Sidebar mini-profile | `client/src/modules/conversations/components/Sidebar.tsx` | ✅ | Injects `StatusSelector` instead of static presence dot |
| Supabase DB trigger | `SUPABASE_QUERIES.sql` | ✅ | Syncs `raw_user_meta_data.username` → `User.username` |
| `useUser` hook | `client/src/modules/auth/store/useAuthStore.ts` | ✅ | Returns Supabase user object with `user_metadata` |

---

## Architecture Decisions & Implementation

### 1. Profile data model

Added fields directly to the Prisma `User` model rather than creating a separate profile table. Migrated using raw SQL via `prisma db execute` to prevent drift.

```prisma
model User {
  id         String   @id
  email      String   @unique
  username   String
  avatarUrl  String?     // DEPRECATED: fallback for legacy users
  avatarPath String?     // NEW: Supabase Storage path
  fullName   String?     // NEW: Only shown on profile page, never in chat
  bio        String?     // NEW: short bio / about me
  status     UserStatus? @default(AVAILABLE) // NEW
  statusText String?     // NEW: custom status message
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  // ... existing relations
}

enum UserStatus {
  AVAILABLE
  AWAY
  DND
  INVISIBLE
}
```

**Rule enforced:** "No you must always display username! Full name is for profiles only."

### 2. Avatar upload — Supabase Storage

Avatars are stored in Supabase Storage (`avatars` bucket).
- `avatarUrl` column is deprecated. All new writes must use `avatarPath`.
- Storage paths are strictly formatted as `${userId}/${filename}`.
- Backend API validates the path to prevent spoofing and storage abuse.
- Frontend enforces a 5MB size limit and allowed MIME types.

### 3. User status — Presence + DB

- **Socket presence** continues driving `user:online` / `user:offline` (existing).
- **User-set status** (`AVAILABLE`, `AWAY`, `DND`, `INVISIBLE`) is stored in Postgres.
- **INVISIBLE:** User appears offline (`gray` dot) to others.
- Sidebar profile UI uses `StatusSelector.tsx` for setting status and statusText.

### 4. Profile page route

```
/users/:id   →  Public profile view (UserProfilePage.tsx)
/settings/profile  →  Edit own profile (ProfileSettings.tsx)
```

The public profile page includes the user's avatar, username, full name, bio, current status, and a "Message" button to open a DM.

---

## Data Flow

### Editing own profile
```
User navigates to /settings/profile
  → Edits username, full name, bio
  → PATCH /api/users/me { username, fullName, bio }
  → Server updates User
```

### Uploading avatar
```
User clicks camera icon in /settings/profile
  → Uploads to Supabase Storage bucket "avatars" via `uploadAvatar` helper
  → Returns storage path
  → PATCH /api/users/me/avatar { avatarPath }
  → Server verifies path belongs to user and updates DB
```

### Setting user status
```
User clicks status dot in Sidebar
  → Opens StatusSelector dropdown
  → PATCH /api/users/me/status { status: "AWAY", statusText: "Lunch" }
  → Server updates DB
  → Server emits socket event "USER_STATUS_UPDATE"
  → Connected clients invalidate cache / update UI
```

---

## Verification & Checks Completed
- [x] Raw SQL migration successfully applied.
- [x] Zod validation (max lengths, enum types) on backend.
- [x] Strict TypeScript typings (`noEmit` validation passed for client and server).
- [x] Avatar path spoofing protection verified.
- [x] Avatar size limits (5MB) enforced on frontend.
- [x] Username is used everywhere in the UI except the `/users/:id` profile page which shows the full name.

---

## Post-Implementation Architectural Fixes

Following a code review, several architectural concerns and edge cases were addressed:

1. **Username Uniqueness Error:** Implemented specific handling for Prisma `P2002` constraint errors in `updateProfile` to return a `409 Conflict` rather than a generic 500 error.
2. **Orphaned Avatars:** Updated `uploadAvatar` to accept the old `avatarPath` and explicitly delete the old file from Supabase Storage prior to assigning the new one, preventing bucket bloat.
3. **Stale Status on Reconnect:** Modified `presence:initial` socket handler to fetch active statuses of all online users from the database. The client's `SocketProvider` was updated to listen to `presence:initial` and `user:status:update` and actively invalidate `["users"]` and `["workspaces"]` React Query caches.
4. **Scoped Socket Emissions:** Scoped the `USER_STATUS_UPDATE` socket event emission to specific `workspace:${id}` rooms rather than globally broadcasting it, ensuring better scale.
5. **Types and Selects:** Extended `WorkspaceMember.user` in the TypeScript types and in Prisma `select` clauses within `workspaces.repository.ts` to properly pass `fullName`, `avatarPath`, `status`, and `statusText`.
6. **User Search Display:** Adjusted user search surfaces (e.g., `NewConversationModal`, `InviteModal`) to display the user's full name alongside their `@username` to aid in discovery, while maintaining `@username` as the primary identifier in conversation context.
7. **UX Polishes:** Added `<Loader2>` spinners during avatar uploads and removed `e.preventDefault()` in `StatusSelector.tsx` so the dropdown menu automatically closes after a selection.
