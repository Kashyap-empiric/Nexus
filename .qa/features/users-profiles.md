# Feature: Users & Profiles

## Goal

Allow users to view, update, and manage their profile information (full name, bio, avatar, status), search for other users, and view public profiles.

---

## Current Status

```
Implemented
```

Full CRUD for profile, avatar upload, status management, user search, username availability check, and public profile viewing are all implemented and functional.

---

## High-Level Summary

- Profile update, avatar management, status, search, and username check all have working endpoints.
- Avatar upload stored in Supabase Storage; URL validation restricts to avatar bucket prefix.
- User status changes broadcast in real-time via socket events to user and workspace rooms.
- Profile updates also broadcast via socket.
- Account deletion flow exists with confirmation string requirement (`DELETE <email>`).
- User search excludes self and currently-deleting users.
- Status enum enforced at DB level: AVAILABLE, AWAY, DND, INVISIBLE.

---

## Code Locations

```
Backend

server/src/modules/users/users.service.ts        — Profile CRUD, search, delete
server/src/modules/users/users.controller.ts     — Request handlers
server/src/modules/users/users.routes.ts         — Route definitions
server/src/modules/users/users.repository.ts     — Prisma queries
server/src/modules/users/users.schema.ts         — Zod validation
server/src/utils/upload.ts                       — Avatar path extraction
server/src/socket/socket.dispatcher.ts           — Status/profile socket dispatch

Frontend

client/src/modules/users/index.ts                — Module barrel
client/src/modules/users/hooks/useProfile.ts     — Profile hooks
client/src/modules/users/hooks/useUsers.ts       — User search hooks
client/src/modules/users/api/users.api.ts        — API client
client/src/modules/users/components/UserProfilePage.tsx  — Profile page
client/src/modules/users/components/UserFooterMenu.tsx   — Footer menu with status
client/src/modules/settings/components/ProfileSettings.tsx   — Profile settings UI
client/src/modules/chat/components/NavigationRail.tsx       — Status in nav
```

---

## Database

```prisma
model User {
  id          String     @id
  email       String     @unique
  avatarUrl   String?
  username    String     @unique
  fullName    String?
  bio         String?
  status      UserStatus @default(AVAILABLE)
  statusText  String?
  avatarPath  String?
  isDeleting  Boolean    @default(false)
}

enum UserStatus {
  AVAILABLE
  AWAY
  DND
  INVISIBLE
}
```

- `username` has a unique constraint at DB level.
- `email` has a unique constraint at DB level.
- `status` is an enum with 4 values.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/users/me` | Required | Get own full profile |
| PATCH | `/api/users/me` | Required | Update profile fields |
| PATCH | `/api/users/me/avatar` | Required | Update avatar URL |
| PATCH | `/api/users/me/status` | Required | Update status |
| DELETE | `/api/users/me` | Required | Delete account |
| GET | `/api/users/search?q=` | Required | Search users by query |
| GET | `/api/users/check-username?username=` | Public | Check username availability |
| POST | `/api/users/resolve-username` | Public | Resolve username to email |
| GET | `/api/users/:id` | Required | Get public profile |

### Request Validation

- `updateProfileSchema`: username (3-30 chars), fullName (max 80, nullable), bio (max 160, nullable), isOnboarded (boolean).
- `updateAvatarSchema`: avatarUrl (url, nullable).
- `updateStatusSchema`: status (enum), statusText (max 100, nullable).
- `deleteAccountSchema`: confirmation (string, min 1).
- `searchUsersQuerySchema`: q (string, max 100, default "").
- Avatar URL validation: must start with `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`.

### Permissions

- Profile update: only self.
- Public profile: any authenticated user.
- Username check: public (no auth required).
- Search: any authenticated user.
- Avatar update: only self, restricted to user's avatar bucket folder.

---

## Backend Implementation

### Profile Service (`server/src/modules/users/users.service.ts`)

- `getMyProfile()` — returns full user record by ID.
- `getPublicProfile()` — returns limited fields (id, username, fullName, avatarUrl, bio, status, createdAt).
- `updateProfile()` — updates username, fullName, bio, isOnboarded.
- `updateAvatar()` — extracts avatarPath from URL, updates both avatarUrl and avatarPath.
- `updateStatus()` — updates status enum and optional statusText.
- `searchUsers()` — searches by username or email (case-insensitive, contains), excludes self and isDeleting users, limited to 10 results.
- `deleteAccount()` — marks owned workspaces as deleting, sets user as deleting, runs cleanup transaction removing all user data, then deletes the user.

### Account Deletion (`server/src/modules/users/users.controller.ts`)

- Requires `confirmation` string equal to `DELETE <email>`.
- Disconnects all user sockets via `io.in(userId).disconnectSockets(true)`.
- Enqueues a `delete-account` BullMQ job for async cleanup.

### Socket Dispatch

- `dispatchUserProfileUpdate()` — broadcasts `USER_UPDATE` to user room and all workspace rooms.
- `dispatchUserStatusUpdate()` — broadcasts `USER_STATUS_UPDATE` to user room and all workspace rooms.

---

## Frontend Implementation

### ProfileSettings (`client/src/modules/settings/components/ProfileSettings.tsx`)

- Form fields: fullName, bio, username.
- Avatar upload with preview.
- Calls appropriate API endpoints on save.

### UserProfilePage (`client/src/modules/users/components/UserProfilePage.tsx`)

- Displays public profile for a given user ID.
- Shows avatar, username, fullName, bio, status, join date.

### UserFooterMenu (`client/src/modules/users/components/UserFooterMenu.tsx`)

- Bottom-of-sidebar user menu with status selector.
- Shows current status with color indicator.
- Dropdown to switch between AVAILABLE, AWAY, DND, INVISIBLE.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Profile CRUD | ✅ | `updateProfile` in service |
| Avatar upload with URL validation | ✅ | `updateAvatar` with prefix check |
| Status management | ✅ | `updateStatus` + socket broadcast |
| User search | ✅ | `searchUsers` in repository |
| Username availability check | ✅ | Public endpoint `check-username` |
| Public profile | ✅ | `getPublicProfile` |
| Account deletion | ✅ | `deleteAccount` flow |
| Status socket broadcast | ✅ | `dispatchUserStatusUpdate` |
| Profile socket broadcast | ✅ | `dispatchUserProfileUpdate` |
| Avatar crop/resize on upload | ❌ | No client-side image processing |
| Batch user import | ❌ | Not implemented |
| Admin user management panel | ❌ | Not implemented |
| Avatar moderation | ❌ | No content moderation on uploads |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| Update own fullName | Profile updated, socket broadcast | `updateProfile` called, `dispatchUserProfileUpdate` | ✅ |
| Upload valid avatar | Avatar URL saved, preview updates | URL validated against bucket prefix, stored | ✅ |
| Upload avatar outside bucket | 403 error | Prefix check rejects | ✅ |
| Change status to DND | Status updated, broadcast to workspaces | `dispatchUserStatusUpdate` to user + workspace rooms | ✅ |
| Search by partial username | Matching results returned (excl. self) | `contains` query, `isDeleting: false` filter | ✅ |
| Check available username | `{ available: true }` | `findByUsername` returns null | ✅ |
| Check taken username | `{ available: false }` | `findByUsername` returns user | ✅ |
| Delete account with wrong confirmation | 400 error | "Type exactly 'DELETE ...' to confirm" | ✅ |
| Delete account with correct confirmation | 202, socket disconnect | `deleteAccount` called, sockets disconnected | ✅ |
| View public profile of another user | Limited profile fields | `getPublicProfile` returns selected fields | ✅ |
| Set duplicate username | 409 error | P2002 Prisma error caught | ✅ |

---

## Current Flow

```
Profile update:
  Client → PATCH /api/users/me (authMiddleware) → updateProfile → prisma.user.update
  → dispatchUserProfileUpdate → socket broadcast to user + workspace rooms

Status update:
  Client → PATCH /api/users/me/status (authMiddleware) → updateStatus → prisma.user.update
  → dispatchUserStatusUpdate → socket broadcast to user + workspace rooms

Account deletion:
  Client → DELETE /api/users/me (authMiddleware) → deleteAccount → setUserDeleting
  → cleanup transaction (delete all user data) → socket disconnect → BullMQ job
```

---

## Missing Pieces

```
□ Avatar crop/resize on upload
□ Batch user import
□ Admin user management panel
□ Avatar content moderation
□ Email change flow
□ User preferences per-workspace
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Avatar URL points to external domain | Rejected (prefix check) | ✅ |
| Status text > 100 chars | Zod validation rejects | ✅ |
| Username < 3 chars | Zod validation rejects | ✅ |
| Search for self | Excluded from results | ✅ |
| Delete last workspace owner | Blocked (must transfer ownership) | ✅ |
| View profile of deleted user | 404 from public profile | ✅ |
| Concurrent status update | Last writer wins (no conflict detection) | ⚠️ |

---

## Known Limitations

- Avatar URL validation uses string prefix check — could be bypassed with path traversal within the bucket.
- No avatar crop/resize — client responsible for image preparation before upload.
- User search uses `contains` (LIKE %query%) — degrades at scale; no full-text search index.
- No email change endpoint exists; email is managed through Supabase directly.
- Status updates have no debouncing — rapid changes generate excessive socket events.
- Account deletion cleanup runs in a transaction but is synchronous — large accounts may cause timeouts.

---

## Files Inspected

```
server/src/modules/users/users.service.ts
server/src/modules/users/users.controller.ts
server/src/modules/users/users.routes.ts
server/src/modules/users/users.repository.ts
server/src/modules/users/users.schema.ts
server/src/utils/upload.ts
server/src/socket/socket.dispatcher.ts
server/prisma/schema.prisma
client/src/modules/users/hooks/useProfile.ts
client/src/modules/users/hooks/useUsers.ts
client/src/modules/users/api/users.api.ts
client/src/modules/users/components/UserProfilePage.tsx
client/src/modules/users/components/UserFooterMenu.tsx
client/src/modules/settings/components/ProfileSettings.tsx
```
