# User Profiles — Implementation Plan

> **Status:** Analysis phase. Planning document.
> **Last updated:** 2026-06-12

---

## Existing Infrastructure Audit

### What Already Exists

| Asset | Location | Status | Notes |
|---|---|---|---|
| `User` model | `server/prisma/schema.prisma` | ✅ | Fields: `id`, `email`, `username`, `avatarUrl`, `createdAt`, `updatedAt` |
| `findUserById` | `server/src/modules/users/users.repository.ts` | ✅ | Returns full user record |
| `searchUsers` | `server/src/modules/users/users.service.ts` | ✅ | Searches by username/email, excludes current user |
| `GET /api/users/search?q=` | `server/src/modules/users/users.routes.ts` | ✅ | Returns `{ data: UserSearchResult[] }` |
| `UserAvatar` component | `client/src/shared/components/ui/user-avatar.tsx` | ✅ | Avatar with initials fallback, name + src props |
| `Avatar` component (shadcn) | `client/src/shared/components/ui/avatar.tsx` | ✅ | Base component with size variants (sm, default, lg), badge, group |
| `PresenceIndicator` | `client/src/modules/chat/components/PresenceIndicator.tsx` | ✅ | Green/gray dot for online/offline |
| Sidebar mini-profile | `client/src/modules/conversations/components/Sidebar.tsx` (lines ~337-360) | ✅ | Shows avatar, username, status dot, logout button |
| Auth user metadata | Supabase Auth | ✅ | `username` stored in `user_metadata` on registration |
| Supabase DB trigger | `SUPABASE_QUERIES.sql` | ✅ | Syncs `raw_user_meta_data.username` → `User.username` |
| `useUser` hook | `client/src/modules/auth/store/useAuthStore.ts` | ✅ | Returns Supabase user object with `user_metadata` |

### What's Missing

| Gap | Impact | Complexity |
|---|---|---|
| No dedicated profile page (`/users/:id`) | Cannot view another user's profile | Medium |
| No profile editing (username, avatar) | Users stuck with registration username | Medium |
| No avatar upload | Users have no way to set an avatar | High (needs file storage) |
| No user status (online/away/busy/DND) | Cannot communicate availability beyond online/offline | Medium |
| No `GET /api/users/:id` endpoint | No server endpoint for fetching a single user's profile | Low |
| No `PATCH /api/users/me` endpoint | No way to update username, bio, or avatar | Low |
| No bio/about field on User model | No way to display user description | Low |
| Profile not clickable from messages | Cannot click on a user's name/avatar to see their profile | Low |

---

## Architecture Decisions

### 1. Profile data model — extend existing `User` model

Add fields to the Prisma `User` model rather than creating a separate profile table:

```prisma
model User {
  id        String   @id
  email     String   @unique
  username  String
  avatarUrl String?
  displayName String?          // NEW — optional display name (defaults to username)
  bio       String?            // NEW — short bio / about me
  status    UserStatus?        // NEW — enum: ONLINE, AWAY, BUSY, INVISIBLE, OFFLINE
  statusText String?           // NEW — custom status message ("Working on Nexus...")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // ... existing relations
}

enum UserStatus {              // NEW
  ONLINE
  AWAY
  BUSY
  INVISIBLE
  OFFLINE
}
```

**Why not a separate profile table?**
- User profile data is 1:1 with the auth identity
- A separate table adds unnecessary joins for every user display
- The existing `User` model is already the profile — just extend it
- Keeps the schema simple (no `Profile` ↔ `User` synchronization issues)

### 2. Avatar upload — use file storage service (not DB binary)

Avatars should be stored in a file storage service, not as base64 in the database:
- **Option A:** Supabase Storage (recommended — already on Supabase)
- **Option B:** Upload to an external service (Cloudinary, UploadThing)
- **Option C:** Store as base64 in `avatarUrl` (simplest, but no resizing/caching)

**Recommendation:** Supabase Storage — already in the Supabase ecosystem, bucket policies align with auth, free tier is generous.

### 3. User status — dual-write to presence + DB

The existing presence system (Redis) tracks socket-level online/offline. The new status system should layer on top:
- **Socket presence** continues driving `user:online` / `user:offline` (existing)
- **User-set status** (AWAY, BUSY, INVISIBLE) is stored in the DB and returned via API
- **Default:** When user is connected via socket → `ONLINE`. When user sets `BUSY` → override.
- **INVISIBLE:** User appears offline to others but can still use the app

### 4. Profile page route

```
/users/:id   →  Public profile view (viewing anyone)
/settings/profile  →  Edit own profile (username, display name, bio, avatar)
```

The profile page is **public** — any authenticated user can view any other user's profile. The settings page is **private** — only the user themselves can edit.

### 5. No mutual profile fields (MVP)

Do NOT implement for MVP:
- Pronouns
- Timezone
- Social links
- Custom theme colors
- Profile badges
- Activity status display (currently listening, etc.)
- Profile visibility settings (who can see what)

---

## Data Flow

### Viewing a user profile

```
User clicks on username/avatar in message, member list, or sidebar
  → GET /api/users/:id
  → Server returns { id, username, displayName, avatarUrl, bio, status, statusText, createdAt }
  → Client renders profile page / profile card
```

### Editing own profile

```
User navigates to /settings/profile
  → Fetches current profile via GET /api/users/me
  → Edits username, display name, bio
  → PATCH /api/users/me { username?, displayName?, bio? }
  → Server validates + updates
  → Returns updated profile
  → Client updates cache + UI
```

### Uploading avatar

```
User clicks avatar in /settings/profile
  → Opens file picker (png, jpg, webp, max 5MB)
  → Uploads to Supabase Storage bucket "avatars"
  → Returns public URL
  → PATCH /api/users/me { avatarUrl: "https://..." }
  → Server updates avatarUrl
  → Avatar updates everywhere: sidebar, messages, member list, profile
```

### Setting user status

```
User clicks status in profile section
  → Opens status selector (Online, Away, Busy, Invisible)
  → PATCH /api/users/me/status { status: "BUSY", statusText?: "In a meeting" }
  → Server updates DB
  → Server emits socket event "user:status" to user:{userId} room
  → Online friends see status update in real-time
  → If INVISIBLE, socket presence stops broadcasting user:online
```

---

## Implementation Steps

### Phase 1: Backend — Profile API

#### Step 1: Database migration

- [ ] Add `displayName`, `bio`, `status` (UserStatus enum), `statusText` fields to User model
- [ ] Create `UserStatus` enum: `ONLINE`, `AWAY`, `BUSY`, `INVISIBLE`, `OFFLINE`
- [ ] Run migration

#### Step 2: Profile endpoints

- [ ] `GET /api/users/:id` — Public profile
  - Returns: `{ id, username, displayName, avatarUrl, bio, status, statusText, createdAt }`
  - 404 if user not found
  - Auth required (only authenticated users can view profiles)
  
- [ ] `GET /api/users/me` — Own profile (full data)
  - Returns same as above, plus email
  - Auth required
  
- [ ] `PATCH /api/users/me` — Update profile
  - Body: `{ username?, displayName?, bio? }`
  - Validate username uniqueness (check for conflicts)
  - Validate username format (3-30 chars, alphanumeric + underscores)
  - Auth required
  
- [ ] `PATCH /api/users/me/avatar` — Update avatar
  - Body: `{ avatarUrl: string }`
  - Validate URL is from allowed origin (Supabase storage or empty)
  - Auth required
  
- [ ] `PATCH /api/users/me/status` — Update status
  - Body: `{ status: UserStatus, statusText?: string }`
  - Auth required

#### Step 3: Socket event for status changes

- [ ] Add `USER_STATUS: "user:status"` to `SOCKET_EVENTS`
- [ ] On status update, emit to `user:status` → broadcast to workspace rooms
- [ ] Payload: `{ userId, status, statusText }`
- [ ] Client handler: update user's display status in active conversations + member lists

#### Step 4: Files — Profile service

- [ ] Create `server/src/modules/users/users.service.ts` (extend existing)
  - `getProfile(userId)` — fetch user by ID
  - `getMyProfile(userId)` — fetch own profile
  - `updateProfile(userId, data)` — update profile fields
  - `updateAvatar(userId, avatarUrl)` — update avatar URL
  - `updateStatus(userId, status, statusText?)` — update status
  - Validate: username uniqueness, username format, field lengths

- [ ] Extend `server/src/modules/users/users.repository.ts`
  - `findUserById` (exists — extend select)
  - `updateUser` — generic update
  - `isUsernameTaken(username, excludeUserId?)` — uniqueness check

- [ ] Create `server/src/modules/users/users.controller.ts` (extend existing)
  - `getUserProfile` — GET /users/:id
  - `getMyProfile` — GET /users/me
  - `updateProfile` — PATCH /users/me
  - `updateAvatar` — PATCH /users/me/avatar
  - `updateStatus` — PATCH /users/me/status

- [ ] Create `server/src/modules/users/users.schema.ts` (extend existing)
  - `getUserParamsSchema` — `id` UUID param
  - `updateProfileBodySchema` — username, displayName, bio
  - `updateAvatarBodySchema` — avatarUrl
  - `updateStatusBodySchema` — status, statusText

- [ ] Create `server/src/modules/users/users.types.ts` (extend existing)
  - `UserProfile` response type
  - `UpdateProfileBody`, `UpdateAvatarBody`, `UpdateStatusBody`

### Phase 2: Client — Profile Page

#### Step 5: Profile API client

- [ ] Extend `client/src/modules/users/api/users.api.ts`
  - `getUserProfile(userId)` → GET `/api/users/:id`
  - `getMyProfile()` → GET `/api/users/me`
  - `updateProfile(data)` → PATCH `/api/users/me`
  - `updateAvatar(avatarUrl)` → PATCH `/api/users/me/avatar`
  - `updateStatus(status, statusText?)` → PATCH `/api/users/me/status`

#### Step 6: Profile hooks

- [ ] Create `client/src/modules/users/hooks/useUserProfile.ts`
  - `useUserProfile(userId)` — fetch profile by ID (useQuery)
  - `useMyProfile()` — fetch own profile (useQuery)
  - `useUpdateProfile()` — update mutation (useMutation with cache invalidation)
  - `useUpdateAvatar()` — avatar update mutation
  - `useUpdateStatus()` — status update mutation with socket emission

#### Step 7: Profile page component

- [ ] Create `client/src/app/(protected)/users/[id]/page.tsx`
- [ ] Route: `/users/:id`
- [ ] Layout: full-page profile view
- [ ] Components:
  - Large avatar (size="lg") with presence indicator
  - Username + display name
  - Bio text
  - Status badge (Online, Away, Busy)
  - Join date ("Joined June 2026")
  - Workspace memberships (list of workspaces they share with current user)
  - "Send Message" button (creates or opens DM)
  - Recent shared conversations (optional, Phase 2)
- [ ] States:
  - Loading: skeleton (avatar circle + text lines)
  - Loaded: full profile display
  - Error: "User not found" with back button
  - Self-view: "This is you" indicator, link to /settings/profile

#### Step 8: Profile card component (reusable)

- [ ] Create `client/src/modules/users/components/UserProfileCard.tsx`
  - Used in: profile page, hover cards (future), mention autocomplete (future)
  - Props: `user` with profile data
  - Shows: avatar, username/display name, status, bio (truncated), "Message" button

#### Step 9: Clickable user avatars

- [ ] Make usernames and avatars clickable in:
  - `MessageGroupItem.tsx` — click username → navigate to `/users/:id`
  - `MemberListPanel.tsx` — click member → navigate to `/users/:id`
  - `Sidebar.tsx` — click own profile → navigate to `/settings/profile`
- [ ] Use `useRouter.push()` with `next/navigation` (standard pattern)

### Phase 3: Avatar Upload

#### Step 10: Supabase Storage integration

- [ ] Create "avatars" bucket in Supabase Storage
  - Public read access (anyone can view avatars)
  - Authenticated write access (users can only upload their own)
  - File size limit: 5MB
  - Allowed MIME types: image/png, image/jpeg, image/webp
- [ ] Add client-side upload helper: `client/src/shared/lib/upload.ts`
  - `uploadAvatar(file: File): Promise<string>` → returns public URL
  - Uses Supabase Storage SDK (`@supabase/storage-js` or existing supabase client)
  - Generates unique filename: `{userId}/{timestamp}-{originalName}`

#### Step 11: Avatar upload UI

- [ ] Add avatar upload to profile edit page (`/settings/profile`)
  - Click avatar → file picker opens
  - Preview selected image before uploading
  - Upload progress indicator
  - Error handling (file too large, wrong format, upload failed)
  - Success: new avatar appears everywhere

### Phase 4: User Status UI

#### Step 12: Status selector component

- [ ] Create `client/src/modules/users/components/StatusSelector.tsx`
  - Shows current status with colored dot
  - Click opens dropdown with options:
    - 🟢 Online
    - 🟡 Away
    - 🔴 Busy (Do Not Disturb)
    - ⚪ Invisible (appear offline)
  - Custom status text input (e.g., "In a meeting")
  - "Clear status" option (resets to default)
- [ ] Integrate in sidebar profile section (replace simple presence dot)
- [ ] Integrate in profile edit page

#### Step 13: Status display across app

- [ ] Update `PresenceIndicator.tsx` to show status colors:
  - Online: green (existing)
  - Away: yellow
  - Busy: red
  - Offline/Invisible: gray (existing)
- [ ] Show statusText tooltip on hover (e.g., "Busy — In a meeting")
- [ ] Socket handler for `user:status` — update status in real-time

---

## File Changes Summary

### Server

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `displayName`, `bio`, `status`, `statusText`, `UserStatus` enum |
| `server/src/modules/users/users.repository.ts` | Extend `findUserById`, add `updateUser`, `isUsernameTaken` |
| `server/src/modules/users/users.service.ts` | Add `getProfile`, `getMyProfile`, `updateProfile`, `updateAvatar`, `updateStatus` |
| `server/src/modules/users/users.controller.ts` | Add route handlers for profile endpoints |
| `server/src/modules/users/users.routes.ts` | Add profile routes |
| `server/src/modules/users/users.schema.ts` | Add validation schemas |
| `server/src/modules/users/users.types.ts` | Add response/request types |
| `server/src/config/url.ts` | Add `/api/users/:id` route |
| `server/src/shared/socket-events.ts` | Add `USER_STATUS` event constant |
| `server/src/socket/socket.dispatcher.ts` | Add `dispatchUserStatus` helper |

### Client

| File | Change |
|---|---|
| `client/src/modules/users/api/users.api.ts` | Extend with profile API calls |
| `client/src/modules/users/hooks/useUserProfile.ts` | **New** — profile query/mutation hooks |
| `client/src/modules/users/components/UserProfileCard.tsx` | **New** — reusable profile card |
| `client/src/modules/users/components/UserProfilePage.tsx` | **New** — profile page component |
| `client/src/app/(protected)/users/[id]/page.tsx` | **New** — profile page route |
| `client/src/modules/users/components/StatusSelector.tsx` | **New** — status selector |
| `client/src/modules/chat/components/PresenceIndicator.tsx` | Extend to support status colors |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Make username clickable |
| `client/src/modules/workspaces/components/MemberListPanel.tsx` | Make members clickable |
| `client/src/modules/conversations/components/Sidebar.tsx` | Click own profile → settings |
| `client/src/socket/socket-events.ts` | Add `USER_STATUS` constant |
| `client/src/socket/handlers/presence.handlers.ts` | Handle `user:status` event |
| `client/src/config/url.ts` | Add profile routes |

**Notably NOT implemented in MVP:**
- Profile hover cards (future)
- Activity status (currently listening, playing, etc.)
- Profile pronouns, timezone, social links
- Custom profile themes
- Profile visibility settings

---

## Future Considerations

| Feature | Phase | Complexity |
|---|---|---|
| Profile hover cards | Phase 2 | Medium |
| User search in UI | Phase 2 | Low |
| Display name everywhere (not raw username) | Phase 2 | Low |
| Custom status with emoji | Phase 2 | Low |
| Profile customization (banner, theme) | Phase 3 | High |
| Pronouns, timezone, location | Phase 3 | Low |
| Link sharing (profile URL) | Phase 3 | Low |
| Profile verification badges | Future | Medium |
| Mutual workspace display | Phase 1 | Medium |
