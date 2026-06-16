# Nexus MVP — Completion Status

> **Status:** ✅ All planned blocks complete. See `mvp.md` for current state.

---

## Completed Blocks

### Block 1: Database & Backend — User Profile ✅
- Prisma migration for `fullName`, `isOnboarded`, `bio`, `avatarPath`
- `findUserById` + `updateUser` in repository
- `getMyProfile` + `updateProfile` in service
- `GET /api/users/me` + `PATCH /api/users/me` routes

### Block 2: Frontend — Shared Settings Modal + Profile + Appearance ✅
- URL-driven modal (`?settings=tab`) with back-button support
- Profile tab (avatar, fullName, bio)
- Appearance tab (Light/Dark/System via `next-themes`)
- Notifications tab (push, DM, mention, channel toggles)
- Integrated into `AppLayoutShell.tsx`

### Block 3: Text Formatting ✅
- `react-markdown` + `remark-gfm` installed
- `MarkdownRenderer` component with safe link handling
- Integrated into message display

### Block 4: Inline Replies — Database & Backend ✅
- Prisma migration for `replyToId` self-relation (`onDelete: SetNull`)
- Server type updates for reply context
- Schema validation for `replyToId`
- Cross-conversation reply validation
- Socket payload includes `replyTo`

### Block 5: Inline Replies — Frontend ✅
- `replyingToMessage` state in conversation store
- Reply action button in message hover
- Dismissible reply banner above `MessageInput`
- Reply quote block above replied message
- Click quote block scrolls to original message

### Block 6: UI/UX Improvements + Onboarding System ✅
- Onboarding guard in `AuthGate.tsx` (redirects un-onboarded users)
- Socket event for profile updates (`user:profile-updated`)
- Multi-step onboarding wizard (Profile → Workspace → Done)
- Skip workspace option
- Avatar upload with Supabase Storage
- Bug fixes applied (401 interceptor, query key mismatch, avatar error handling)
- Empty states, loading skeletons, system states
- Message animations, refined hover states, dark mode contrast

---

## What Was Added Beyond the Plan

| Addition | Reason |
|----------|--------|
| Onboarding skip button | Prevents redirect loop when onboarding fails |
| 401 interceptor fix (`refreshSession` → `getSession`) | Token expiry broke all API calls |
| Query key mismatch fix (`["my-profile"]` → `["users", "me"]`) | Onboarding completion caused infinite redirect loop |
| Avatar upload error non-blocking | Optional avatar shouldn't block onboarding |
| Email confirmation UI on login page | Users needed feedback after registration |
| Avatar upload to Supabase Storage | Separate from the Express API, proper file handling |
| Server-side notification module + wiring | `createAndDispatch` wired into invites, workspaces, replies |

---

## What's Left (Non-MVP — Future)

| Feature | Notes |
|---------|-------|
| Message reactions | Schema designed, not implemented |
| Rich text input (WYSIWYG editor) | `@tiptap` is a dependency but not wired |
| Full-text search | PostgreSQL `tsvector` — planned |
| File uploads | No infrastructure yet |
| Typing indicators | Constants defined, not implemented |
| Channel categories | Discord-style grouping |
| Horizontal scaling | Redis Pub/Sub adapter needed |
| Read receipts for channels | `partnerLastReadMessageId` undefined for channels |
