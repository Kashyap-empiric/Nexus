# User Profiles — Post-Implementation Architecture & Code Review

> **Date:** 2026-06-16
> **Feature scope:** User Profiles, Avatar Uploads, Status, Presence, Full Name

---

## 1. Contract Compliance Review

### Database Schema

| Requirement | Status | Notes |
|---|---|---|
| `UserStatus` enum: `AVAILABLE, AWAY, DND, INVISIBLE` | ✅ | Migrated via raw SQL in `20260616104600_add_user_profiles` |
| `fullName` on User model | ✅ | Renamed from `displayName` → `fullName` via `20260616000000_rename_displayname_to_fullname` |
| `bio` on User model | ✅ | Added in same migration |
| `status` / `statusText` on User model | ✅ | Added with default `AVAILABLE` |
| `avatarPath` on User model | ✅ | Added in user profiles migration |
| `avatarUrl` deprecated but kept | ✅ | Still selected and displayed as fallback |

**Deviation:** The contract specified `displayName` originally, but this was renamed to `fullName` during implementation. This is **acceptable** — `fullName` is clearer and aligns with the product rule "username everywhere, full name only on profile pages."

### API Endpoints

| Endpoint | Contract | Status |
|---|---|---|
| `GET /api/users/:id` | Public profile | ✅ Implemented in `users.controller.ts` |
| `GET /api/users/me` | Own profile | ✅ |
| `PATCH /api/users/me` | Update profile | ✅ |
| `PATCH /api/users/me/avatar` | Update avatar | ✅ |
| `PATCH /api/users/me/status` | Update status | ✅ |

**Deviation:** The contract specified that `GET /api/users/me` should return less data than the public profile. In practice, both endpoints exist, with `findPublicProfileById` using a specific `select` clause (excluding `email`, `isOnboarded`, etc.), while `findUserById` returns the full record. This is **correct behavior** — following the principle of least privilege for public vs. own data.

### Avatar Upload Flow

| Requirement | Status | Notes |
|---|---|---|
| Supabase Storage integration | ✅ | Implemented in `upload.ts` |
| 5MB file size limit | ✅ | Checked on client |
| Allowed MIME types | ✅ | `image/png, image/jpeg, image/webp` |
| Path ownership validation | ✅ | Server checks `avatarPath.startsWith(\`${userId}/\`)` |
| URN path validation | ✅ | Zod rejects `https://` and `..` patterns |

**Deviation:** The contract specified using `avatarUrl` directly from Supabase public URL. The implementation uses `avatarPath` (storage path) and constructs the public URL via `getAvatarPublicUrl()` on the client. This is **superior** — the server stores an opaque path, never an external URL, which prevents path injection and URL-based attacks.

### Presence & Status Separation

| Requirement | Status |
|---|---|
| Socket presence is ephemeral (Redis/Map) | ✅ `presenceStore.ts` |
| Status is persistent (Postgres) | ✅ `User.status` column |
| INVISIBLE removes user from online | ✅ `PresenceIndicator.tsx` checks `status !== "INVISIBLE"` |

**✅ Well separated.** Two completely different data stores for two different concerns.

### Security Requirements

| Requirement | Status | Notes |
|---|---|---|
| Auth middleware on all profile endpoints | ✅ | `authMiddleware` used |
| Avatar path ownership validation | ✅ | `avatarPath.startsWith(\`${userId}/\`)` |
| Path traversal prevention | ✅ | Zod rejects `..` |
| Cross-conversation reply prevention | ✅ | `messages.service.ts` validates `parentMessage.conversationId` |

**Finding:** The `updateProfile` controller has no validation for whether the username is already taken (uniqueness is enforced by Prisma Schema, but the error message is a generic 500).

### Cache Invalidation

| Requirement | Status |
|---|---|
| Profile update invalidates users queries | ✅ `setQueryData` + `invalidateQueries` |
| Avatar update invalidates users/conversations/workspaces | ✅ |
| Status update invalidates users/conversations/workspaces | ✅ |
| Socket status update broadcasts to all clients | ✅ `dispatchUserStatusUpdate` uses `io.emit` |

**Deviation:** `useUpdateProfile` calls `queryClient.setQueryData(["users", "me"], updatedProfile)` but the query key is `["users", "me"]` while the `useProfile` hook also uses `["users", "me"]`. This is **correct** for the "me" key, but for other users' profiles queried via `["users", "profile", userId]`, there is no explicit invalidation. This is **acceptable** — other user profiles are read-only views and don't need real-time sync of other users' profiles.

---

## 2. Database & Prisma Review

### Migration Health

- **6 migrations applied** — status: ✅ up to date
- **No drift detected** between schema and database (`prisma migrate diff` reports clean)
- **Prisma Client** was recently regenerated ✅

### Schema Review

```prisma
model User {
  id         String   @id
  email      String   @unique
  username   String
  fullName   String?
  bio        String?
  status     UserStatus  @default(AVAILABLE)
  statusText String?
  avatarUrl  String?
  avatarPath String?
  // ... other fields
}

enum UserStatus { AVAILABLE | AWAY | DND | INVISIBLE }
```

Findings:

1. **Nullable - good choices:** `fullName`, `bio`, `statusText`, `avatarPath`, `avatarUrl` are all correctly nullable (they're optional user info).
2. **`status` has a default of `AVAILABLE`** — this means all existing users get AVAILABLE without a migration update. Acceptable.
3. **`avatarUrl` retained as deprecated column** — good backward compatibility for legacy users, but creates ambiguity in code (two potential sources of truth). See section 3.
4. **No index on `User.status`** — status filtering isn't done in queries currently, so this is fine. If "filter by status" is added later, an index may be needed.
5. **No `@@index([status])` needed now** — acceptable.

### Migration Risks

The manual SQL migrations use `IF NOT EXISTS` patterns, making them idempotent. This is a **good practice** and prevents drift from re-running migrations.

---

## 3. Avatar System Review

### Storage Flow

```
Client: File picker → uploadAvatar() → supabase.storage.from("avatars").upload()
Client: updateAvatar(path) → PATCH /api/users/me/avatar { avatarPath }
Server: Validates path ownership → prisma.user.update({ avatarPath })
Client: getAvatarPublicUrl(avatarPath) → constructs Supabase public URL
```

### Storage Bucket Analysis

**Status:** No Supabase Storage policies were reviewed (they're set up in Supabase dashboard, not in code). The bucket "avatars" must have:
- **Public read** — `getPublicUrl` works without auth
- **Authenticated write** — users can upload to their own folder
- **No anonymous delete** — prevent avatar deletion by other users

### Path Spoofing Vulnerability

✅ **Server-side validation:** `avatarPath.startsWith(\`${userId}/\`)` in controller
✅ **Zod validation:** Rejects URLs containing `..` or `https://`
✅ **Path format:** `${userId}/avatar_${timestamp}.${ext}` — userId is bound to authenticated user

However, there is a **minor gap**: The Zod schema checks `if (path.includes('..')) return false` but this doesn't catch all path traversal attempts. For example, a path like `abc/../../etc` would be caught, but the stricter check is `avatarPath.startsWith(\`${userId}/\`)` in the controller. The Zod check is redundant but additional defense-in-depth.

### Orphaned File Risk

**⚠️ Issue:** When a user uploads a new avatar, the old file in Supabase Storage is **not deleted**. With `upsert: true` used in the upload, Supabase overwrites the same path (since the path includes a timestamp, it actually creates a new file each time). Over time, this creates orphaned files in the storage bucket.

**Recommendation:** Add a cleanup step before upload that deletes the previous avatar file from storage when `avatarPath` is not null.

### Stale Cache Risk

**Low risk.** Avatars are loaded via `getAvatarPublicUrl()` which constructs a URL based on the storage path. Supabase Storage supports cache control headers (`cacheControl: "3600"` set in upload). If a user changes their avatar, the cache will refresh within 1 hour. For a chat app at Nexus's stage, this is acceptable.

### Security Weaknesses

- **No MIME type validation server-side** — Client validates, but a malicious client could bypass. Supabase Storage should have bucket-level MIME restrictions.
- **No file size validation server-side** — Client validates 5MB limit, but server should also validate.

### Production-Safety Assessment

**Adequate for MVP, not production-hardened.** The core security (path ownership, traversal prevention, auth) is in place. Missing are: server-side file validation, orphaned file cleanup, and Supabase bucket policies (need verification).

---

## 4. Presence & Status Review

### Architecture

```
Presence (Ephemeral):
  Server: presenceStore.ts (Redis + in-memory Map)
  Socket Events: user:online / user:offline / presence:initial
  Client: socketStore.ts (addUserOnline / removeUserOffline)

Status (Persistent):
  Server: User.status in Postgres
  API: PATCH /api/users/me/status → dispatchUserStatusUpdate
  Socket Event: user:status:update
  Client: Socket handler + cache-invalidation
```

### Correct Behavior

| Scenario | Behavior | Status |
|---|---|---|
| User connects socket | `user:online` emitted, added to presence | ✅ |
| User disconnects all sockets | `user:offline` emitted | ✅ |
| Multi-tab support | Presence tracks multiple socket IDs per user | ✅ |
| User sets INVISIBLE | Stays in socket presence but gray dot shown | ✅ |
| User sets DND/AWAY | Status color changes (red/yellow) | ✅ |

### Presence Issues

1. **Reconnect race condition:** On page refresh, the old socket fires `disconnect` while the new socket simultaneously fires `connect`. With async operations, `isNowOffline` could return `true` briefly, causing a brief "user offline" flash. The `presenceStore.ts` mitigates this with synchronous memory operations but there's still an async gap between the memory add/remove and the socket event broadcast.

2. **Status not synced on reconnect:** When a user reconnects, `presence:initial` sends the list of online user IDs, but the client does NOT fetch the current status for those users. It only has the status cached from before. If a user changed their status while the client was disconnected, the stale status will display until the next user interaction forces a re-fetch.

### Invisible Mode

✅ **Correctly implemented.** When `INVISIBLE`, `isActuallyOnline` is `false`, so the gray dot is shown. The user still has socket presence active (can send/receive messages), just appears offline.

### Offline Users

✅ **Correctly handled.** `isOnline` checks `onlineUsers.has(userId)` from the socket store. If no socket, the user is offline.

---

## 5. API Review

### Endpoints Summary

| Endpoint | Auth | Validation | Response Shape |
|---|---|---|---|
| `GET /api/users/me` | ✅ | — | `{ data: User }` (full) |
| `GET /api/users/:id` | ✅ | — | `{ data: UserProfile }` (public) |
| `PATCH /api/users/me` | ✅ | ✅ Zod | `{ data: User }` |
| `PATCH /api/users/me/avatar` | ✅ | ✅ Zod + custom | `{ data: User }` |
| `PATCH /api/users/me/status` | ✅ | ✅ Zod | `{ data: User }` |

### Authorization

✅ All endpoints use `authMiddleware` which verifies the JWT.
✅ `PATCH /api/users/me/*` endpoints only update the authenticated user's data (uses `req.user!.id`).

### Validation

✅ Zod schemas for all PATCH endpoints with proper max lengths.
- `fullName`: max 80 chars
- `bio`: max 160 chars
- `statusText`: max 100 chars
- `username`: min 3, max 30 chars

### Data Exposure

`PATCH /api/users/me` returns the full user object, including `email`, after update. This is **acceptable** — it's the user's own data.

`GET /api/users/:id` uses `findPublicProfileById` which selects only public fields. **Email is excluded.** ✅

### Error Handling

**⚠️ Issue:** All user controller methods use generic `catch (error) { console.error(...); res.status(500).json({ error: "Internal server error" }); }`. This means:
- Username uniqueness violations produce a **500** instead of a 409 Conflict with a meaningful error message.
- The Prisma `P2002` (unique constraint violation) error code is not caught and translated.

**Recommendation:** Add Prisma error code handling, specifically for `P2002` (unique constraint) to return `409` with a message like "Username already taken."

---

## 6. Frontend Review

### ProfileSettings

| Aspect | Status |
|---|---|
| Loading state | ✅ Skeleton animation |
| Form validation | ✅ Zod + react-hook-form |
| Avatar upload | ✅ Camera overlay, file picker, upload progress |
| Avatar removal | ✅ Trash button when avatar exists |
| Dirty state | ✅ `isDirty` check disables save button |
| Optimistic update | ✅ `setQueryData` on success |
| Error handling | ✅ Toast on failure |

**Concern:** The avatar upload `isUploading` state shows `"..."` text instead of a spinner. This is a minor UX quality issue.

### UserProfilePage

| Aspect | Status |
|---|---|
| Loading state | ✅ "Loading profile..." with pulse animation |
| Error state | ✅ "Failed to load profile." |
| Empty bio/statusText | ✅ Hidden section when both are null |
| DM button | ✅ Creates conversation, navigates |
| Self-view | ✅ Button hidden for own profile |

**Issue:** The profile page title is `{profile.fullName || profile.username}` which is **correct per contract**. However, there's a "Message" button that uses `api.post("/conversations")` directly instead of going through the conversation API service. This is **inconsistent** with the rest of the codebase.

### StatusSelector

| Aspect | Status |
|---|---|
| Status display | ✅ Colored dot icon |
| Dropdown with options | ✅ All 4 statuses |
| Custom status text | ✅ Input + save button |
| Text updates on open | ✅ Prefills current statusText |
| Success/error feedback | ✅ Toast |

**Issue:** When the user clicks a status option, `e.preventDefault()` is called on the dropdown item, preventing the menu from closing. This is intentional but the comment says "keep menu open or let it close?" — suggesting the developer was unsure. Currently the menu stays open. This is **acceptable** for MVP but could be improved.

**Issue:** The `statusText` input is embedded in the dropdown menu, which creates an odd UX — the user types, submits, and the menu stays open. The `setIsOpen(false)` is called on submit but only after the status text mutation succeeds. If the mutation fails, the menu stays open, which is fine.

### UserAvatar

| Aspect | Status |
|---|---|
| Fallback initials | ✅ `name[0]?.toUpperCase()` |
| AvatarPath priority | ✅ `avatarPath` preferred over `src` |
| Supabase URL construction | ✅ Via `getAvatarPublicUrl()` |

**Issue:** `UserAvatar` accepts both `src` (legacy `avatarUrl`) and `avatarPath` (new storage path). The logic `const finalSrc = avatarPath ? getAvatarPublicUrl(avatarPath) : src;` means if `avatarPath` is null/undefined, it falls back to `avatarUrl`. This is **correct**.

### PresenceIndicator

| Aspect | Status |
|---|---|
| Status-aware colors | ✅ Green/Available, Yellow/Away, Red/DND, Gray/Offline |
| INVISIBLE handling | ✅ `isActuallyOnline = isOnline && status !== "INVISIBLE"` |
| Socket store integration | ✅ Reads from `onlineUsers` Set |

**Issue:** `PresenceIndicator` now takes a `status` prop, but many components pass it without it (e.g., `MemberListPanel.tsx`). Without the prop, the indicator always shows green/online based purely on presence, ignoring the user's persistent status. This means: **In the member list, a user who set DND will still show green instead of red.**

### React Query Usage

| Hook | Cache Strategy | Notes |
|---|---|---|
| `useProfile` | `["users", "me"]` | ✅ Single source of truth |
| `useUpdateProfile` | `setQueryData` + invalidate | ✅ Optimistic |
| `useUpdateAvatar` | `invalidateQueries` | ✅ Refetches all |
| `useUpdateStatus` | `invalidateQueries` | ✅ Refetches all |

**Issue:** `useUpdateStatus` invalidates all "users" queries every time a status change happens, including other users' profiles. This is excessive but functionally harmless for the current dataset size.

---

## 7. Full Name Review (Important)

### Current Usage Audit

| Surface | Current Display | Assessment |
|---|---|---|
| **Message author labels** | `user?.username` only | ✅ Correct — username only |
| **Message headers** | `user?.username` in `MessageGroupItem.tsx` | ✅ Correct |
| **Thread replies** | `msg.replyTo.user?.username` | ✅ Correct |
| **User profile page** | `{profile.fullName \|\| profile.username}` as heading, `@{profile.username}` as subtitle | ✅ Per contract — full name shown on profile |
| **User hover cards** | ❌ Not implemented (N/A) | N/A |
| **Member list** | `member.user?.username` in `MemberListPanel.tsx` | ✅ Correct — username only |
| **Workspace member management** | `member.user?.username` | ✅ Correct |
| **User search** | `username` and `email` returned, not `fullName` | ✅ Correct |
| **DM headers** | `otherMember?.user?.username` in `ActiveConversation.tsx` | ✅ Correct |
| **Mentions autocomplete** | `username` in search results | ✅ Correct |
| **Presence popovers** | ❌ Not implemented (N/A) | N/A |
| **Sidebar entries** | `username` in DM list, `username` in bottom profile | ✅ Correct |

### Assessment

**The current usage of `fullName` is appropriate.** It follows the product rule:

> "No you must always display username! Full name is for profiles only."

`fullName` is used in exactly **two places**:
1. **User profile page** — as the page heading (with `@username` below)
2. **Stored and passed through data pipelines** — it's selected in queries, included in DTOs, and available in socket events

### Overexposure Risk

**None.** `fullName` is not displayed anywhere in conversations, member lists, or sidebar. It's only on the dedicated profile page.

### Underutilization Concern

**Minor.** `fullName` is carried through several data paths (socket events, message DTOs, conversation types) but only actually displayed on the profile page. This is intentional belt-and-suspenders design — the data is available if a future surface needs it, without adding another migration.

### Recommendations for Each Surface

| Surface | Action | Rationale |
|---|---|---|
| Message author labels | **Username only** | Primary identifier in conversation context |
| Message headers | **Username only** | Consistency with message labels |
| Thread replies | **Username only** | Reply preview context - username sufficient |
| User profile page | **Full name + username** | Profile is where identity is fully displayed |
| User hover cards | **Full name + username** (future) | When implemented, should match profile |
| Member list | **Username only** | Lists are reference contexts, not identity deep-dives |
| Workspace member mgmt | **Username only** | Admin context - username sufficient |
| User search | **Username only** | Search is about finding, not identifying deeply |
| DM headers | **Username only** | Chat context - username is correct identifier |
| Mentions autocomplete | **Username only** | Autocomplete uses username for @mention syntax |
| Presence popovers | **Username only** (future) | Brief glance context |
| Sidebar entries | **Username only** | Navigation context |

**No changes recommended** — current implementation correctly uses username in all chat surfaces, and full name only on the profile page.

---

## 8. Final Assessment

### 🚨 Critical Issues

**None found.** No blocking issues that prevent merging.

### ⚠️ Recommended Improvements

| Priority | Issue | Recommendation |
|---|---|---|
| **High** | Username uniqueness error returns 500 instead of 409 | Add Prisma `P2002` error handling in the user controller to return `{ error: "Username already taken" }` with status 409 |
| **Medium** | Orphaned avatar files in Supabase Storage accumulate | Add a cleanup step before upload that deletes the previous avatar file |
| **Medium** | MemberListPanel doesn't pass user status to PresenceIndicator | Add `status` prop from member data to show DND/Away colors in member list |
| **Medium** | StatusSelector dropdown stays open after clicking a status | Close the dropdown after selection (remove or replace `e.preventDefault()`) |
| **Low** | No server-side file validation (MIME type, size) for avatar uploads | Add validation middleware or Multer check on the avatar endpoint |
| **Low** | Avatar upload progress shows "..." instead of a spinner | Use a loading spinner (e.g., `Loader2` from lucide-react) |

### 🏗️ Architectural Concerns

| Concern | Explanation | Risk Window |
|---|---|---|
| **Stale status on reconnect** | `presence:initial` doesn't send user statuses, so reconnected clients may display stale status until a re-fetch | MVP is fine; becomes an issue with high churn users |
| **Global `io.emit` for status updates** | `dispatchUserStatusUpdate` emits to ALL connected clients, not just those sharing a workspace/DM | Fine at current scale (< 100 users); won't scale past thousands |
| **Dual avatar URL sources** | Both `avatarUrl` and `avatarPath` are carried through all pipelines, creating two potential sources of truth | Legacy debt; should be consolidated once all users have migrated |
| **`workspaces/types/workspace.ts` doesn't include `fullName` or `avatarPath`** | The `WorkspaceMember.user` type only has `username` and `avatarUrl`, missing the new fields | Low risk since workspace member list only shows username |

### ✅ Full Name Strategy Recommendation

Nexus should maintain the following identity hierarchy:

```
Primary Identity:  username
  - Used in ALL chat surfaces (messages, threads, DM headers, member lists, mentions)
  - Canonical identifier for user references
  - Must be unique, immutable in the short term (changeable via settings)

Supplemental Identity:  fullName
  - Used ONLY on profile pages (user's own + others')
  - Optional, max 80 characters
  - Never shown in conversation context

Display Logic:
  - If username is the primary key, always show it
  - fullName adds warmth/personality on the profile page
  - @username should always accompany fullName when used
```

**The current implementation aligns with this strategy.** No changes needed.
