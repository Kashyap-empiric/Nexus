# Nexus MVP — Settings, Profiles, Formatting & Replies Plan

> **Goal:** Implement Shared Settings (Profiles + Appearance), Text Formatting, and Inline Replies.
> **Status:** 🟢 Blocks 1–3 Complete | ✅ Blocks 4–5 (Replies) Complete

---

## Current State Assessment

### ❌ Missing Features to Implement

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Shared Settings Modal** | Users need a global modal for settings without losing context. | Medium | **P0** |
| **User Profiles (Settings)** | Users need to edit username/displayName/avatar inside settings. | Medium | **P0** |
| **Appearance Settings** | Users want to explicitly toggle light/dark/system mode. | Low | **P1** |
| **Text Formatting** | Messages lack rich text (bold, italic, lists). | Low | **P1** |
| **Inline Replies** | ✅ Users can reply to specific messages with context. | High | **P0** |
| **Onboarding Flow** | New users have no guided setup experience. | Medium | **P1** |

---

## Execution Map

| Block | Focus | Why This Order |
|-------|-------|----------------|
| **1** | DB + Backend: User profile fields + API | Schema must land before UI is built. |
| **2** | Frontend: Shared Settings Modal + Profile + Appearance | UI can now talk to real endpoints. |
| **3** | Text Formatting (Markdown) | Standalone frontend task, fast win. |
| **4** | Inline Replies — Database & Backend | ✅ Complete — Prisma schema, types, service, repository, socket |
| **5** | Inline Replies — Frontend | ✅ Complete — Reply button, banner, quote block, state management |
| **6** | UI/UX Improvements + Onboarding + Fix Remaining Bugs | Production polish — runs last so no logic changes break it. Also squash low-severity bugs from bugs-found.md. |

---

## Block 1: Database & Backend — User Profile (2 hrs)

### Goal: Lay the server-side foundation for user profiles and onboarding.

**Step 1.1: Prisma Migration**
- Update `schema.prisma`:
```prisma
model User {
  // ... existing fields
  displayName String?
  isOnboarded Boolean @default(false)
}
```
- Run `npx prisma migrate dev --name add_user_profile_fields`.
  > ⚠️ Use `migrate dev` not `db push` — the project uses migration files for history and rollback.

**Step 1.2: Users Repository**
- Extend `server/src/modules/users/users.repository.ts`:
  - `findUserById(id)` — **already exists**, just extend the `select` clause to include `displayName`, `isOnboarded`
  - `updateUser(id, data)` — update `username`, `displayName`, `avatarUrl`, `isOnboarded`

**Step 1.3: Users Service**
- Extend `server/src/modules/users/users.service.ts`:
  - `getMyProfile(userId)` — returns full user record for the settings modal
  - `updateProfile(userId, data)` — validates and updates profile fields

**Step 1.4: Users Controller & Routes**
- Extend `server/src/modules/users/users.controller.ts`:
  - `GET /api/users/me` — returns the authenticated user's profile
  - `PATCH /api/users/me` — updates `username`, `displayName`, `avatarUrl`
- Extend `server/src/modules/users/users.routes.ts` with these two routes (auth-guarded).

---

## Block 2: Frontend — Shared Settings Modal + Profile + Appearance (3 hrs)

### Goal: Global settings modal driven by URL query params.

> **Architecture Decision:** Use URL query parameters (`?settings=profile`) to drive the modal open/close state. This gives us routing-native behavior (back button closes it, direct links work) without the complexity of Next.js intercepting routes.

**Step 2.1: Settings Modal Routing Hook**
- Create `client/src/modules/settings/hooks/useSettingsModal.ts`
- Reads `?settings=<tab>` from `useSearchParams()`.
- Exposes `openSettings(tab)` (pushes query param) and `closeSettings()` (removes it).

**Step 2.2: Shared Settings Modal UI**
- Create `client/src/modules/settings/components/SharedSettingsModal.tsx`
- Controlled by the `?settings` query param (open when param exists, closed when not).
- Left sidebar tabs: Profile, Appearance, Notifications.
- Right pane renders the active tab.
- ESC key and backdrop click call `closeSettings()`.
- Integrate into `AppLayoutShell.tsx` so it renders globally.

**Step 2.3: Profile Settings Tab**
- Create `client/src/modules/settings/components/ProfileSettings.tsx`
- Call `GET /api/users/me` to pre-fill the form.
- Fields: Avatar URL input, Username, Display Name.
- On submit: call `PATCH /api/users/me` via a `useUpdateProfile()` React Query mutation.
- On success: invalidate the current user query so header/sidebar reflect changes instantly.

**Step 2.4: Appearance Settings Tab**
- Create `client/src/modules/settings/components/AppearanceSettings.tsx`
- Use `useTheme()` from `next-themes`.
- Three option cards: Light, Dark, System — active one is highlighted.
- Theme updates instantly on click (no save button needed).

**Step 2.5: Move Notification Settings into Modal**
- Move the content of `NotificationSettings.tsx` into a new Notifications tab in the modal.
  > 💡 Note: `NotificationSettings.tsx` already has fixes applied (push toggle race condition, updateAsync exposure) — these are already done.
- Keep old `/settings/notifications` page route as a redirect to `?settings=notifications` instead of deleting it. This preserves existing bookmarks/links.

---

## Block 3: Text Formatting (1.5 hrs)

### Goal: Render bold, italic, and bullet points safely in chat.

**Step 3.1: Install Dependencies**
```bash
cd client && npm install react-markdown remark-gfm
```

**Step 3.2: MarkdownRenderer Component**
- Create `client/src/modules/messages/components/MarkdownRenderer.tsx`
- Use `react-markdown` with `remark-gfm` plugin.
- Override components:
  - `a` → opens in new tab, `rel="noopener noreferrer"`
  - `p` → `whitespace-pre-wrap`, no extra margins
  - `code` → inline code styling
  - `pre` → code block with subtle background
- Only run the renderer if the content includes markdown chars (`*`, `_`, `` ` ``, `>`, `-`) to avoid unnecessary processing on plain messages.

**Step 3.3: Integration**
- In `MessageGroupItem.tsx`, replace `{msg.content}` with `<MarkdownRenderer content={msg.content} />`.

---

## Block 4: Inline Replies — Database & Backend (2.5 hrs)

### Goal: Add a self-relation on Message to store reply context.

**Step 4.1: Prisma Migration**
- Update `schema.prisma`:
```prisma
model Message {
  // ... existing fields
  replyToId String?
  replyTo   Message?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies   Message[] @relation("MessageReplies")
}
```
- `onDelete: SetNull` — if the parent message is deleted, `replyToId` becomes `null` (deletion-safe).
- Run `npx prisma migrate dev --name add_message_reply_to_id`.
  > ⚠️ Use `migrate dev` not `db push` for consistency with existing migration history.

**Step 4.2: Server type updates**
- Update `server/src/modules/messages/messages.types.ts`:
  - Add `replyToId?: string` and `replyTo?: { id: string; content: string; deletedAt: Date | null; user: { username: string } } | null` to the message DTOs.

**Step 4.3: Message Schema & Service**
- Update `server/src/modules/messages/messages.schema.ts` — add optional `replyToId: z.string().optional()`.
- Update `messages.service.ts` `createMessage()` to accept and persist `replyToId`.
- Validate that the `replyToId` message belongs to the same conversation (prevent cross-conversation replies).

**Step 4.4: API & Socket Updates**
- Update `GET /api/conversations/:id/messages` Prisma query:
```ts
include: {
  replyTo: {
    select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } }
  }
}
```
- Update `message.handler.ts` — include `replyToId` in socket payload from client, include `replyTo` in outgoing `MESSAGE_NEW` broadcast.

---

## Block 5: Inline Replies — Frontend (2.5 hrs)

### Goal: Allow users to reply and see reply context inline.

**Step 5.1: Type Updates**
- Update `Message` type in `client/src/modules/messages/types/message.ts`:
```ts
replyToId?: string;
replyTo?: {
  id: string;
  content: string;
  deletedAt: string | null;
  user: { username: string };
} | null;
```

**Step 5.2: Reply State**
- Add `replyingToMessage: Message | null` and `setReplyingToMessage(msg)` / `clearReply()` to `useConversationStore` (or local state lifted to the conversation view).

**Step 5.3: Reply Action in Message Hover**
- Add "Reply" icon button to hover actions in `MessageGroupItem.tsx`.
- On click: call `setReplyingToMessage(message)`.

**Step 5.4: Reply Banner in Message Input**
- When `replyingToMessage` is set, render a dismissible banner above `MessageInput`:
  > `↩ Replying to @username — [truncated content]  [X]`
- On send: include `replyToId` in the socket payload.
- On send or on X click: call `clearReply()`.

**Step 5.5: Reply Quote Block in Feed**
- In `MessageGroupItem.tsx`, if `message.replyTo` exists:
  - Render a small dimmed quote block above the message:
    > `╰── @username: Original message text...`
  - If `replyTo.deletedAt` is set, render `"[Message deleted]"` instead.
  - Clicking the quote block calls `document.getElementById(replyTo.id)?.scrollIntoView({ behavior: "smooth" })`.

---

## Block 6: UI/UX Improvements + Onboarding System (3 hrs)

### Objective
Transform Nexus into a production-grade polished chat experience.

**Step 6.1: Onboarding Guard**
- In `AuthGate.tsx` (or a new `OnboardingGate.tsx`), check if `user.isOnboarded === false`.
- If not onboarded, redirect to `/onboarding` before allowing entry into the app.

**Step 6.2: Add socket event for profile updates**
- Add `USER_PROFILE_UPDATED: "user:profile-updated"` to `server/src/shared/socket-events.ts`
- In the `updateProfile` controller, after a successful update, emit to the user's room:
  ```ts
  const io = getIO();
  io.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_PROFILE_UPDATED, updatedUser);
  ```
- Add a client-side socket handler in `client/src/socket/handlers/` that updates the auth store and invalidates user queries when profile changes are received.

**Step 6.3: Onboarding Pages**
- Create `client/src/app/(onboarding)/onboarding/page.tsx` with multi-step flow:
  1. Welcome screen (app name + tagline)
  2. Identity setup — `displayName` input + avatar URL
  3. Workspace selection — join existing or create new
  4. Theme selection — Light / Dark / System
  5. Completion — calls `PATCH /api/users/me` with `{ isOnboarded: true }` then redirects to `/`
- Onboarding only runs once. Once `isOnboarded = true`, the guard never triggers again.

**Step 6.4: Fix remaining bugs from bugs-found.md**
- The following low-severity bugs from `bugs-found.md` remain open and should be fixed during this block:
  - **Bug 9**: `updatePreferences` uses `any` type — refactored in controller, confirm clean
  - **Bug 11**: `createAndDispatch` silently swallows socket emit failures — add error propagation or logging
  - **Bug 12**: `sendPushNotification` silently swallows all errors — add error propagation or monitoring
  - **Bug 13**: Push subscribe/unsubscribe share same URL constant — rename `PUSH_UNSUBSCRIBE` to `/notifications/push/unsubscribe`
  - **Bug 14**: `BellPopover` slices to 10 after loading 21 items — reduce default limit to 11
  - **Bug 15**: Service worker `notificationclick` URL normalization — already fixed in sw.js ✅

**Step 6.5: Design System Standardization**
- In `globals.css`, define consistent spacing and typography tokens.
- Create unified message variant styles: `message--normal`, `message--reply`, `message--edited`, `message--system`.

**Step 6.6: Interaction Rules**
- Global `keydown` listener for `Escape` — closes the topmost open overlay (modal, reply banner, popover).
- All modals use `onOpenChange` to support browser back navigation via the query param approach.
- Ensure no layout shift on message load (use `flex-col-reverse` trick or scroll anchor).

**Step 6.7: System States**
- `EmptyChannel` component — shown when a channel has no messages.
- `MessageListSkeleton` component — shown while messages are loading.
- `FailedMessage` state in `MessageGroupItem` — shown when a message fails to send, with a "Retry" button.
- Disconnected websocket banner — shown at the top of the chat when the socket connection is lost.

**Step 6.8: Visual Polish**
- Subtle `fade-in` / `slide-up` animation for new incoming messages (`@keyframes`).
- Refined hover states on sidebar items, message actions, and buttons.
- Improved dark mode contrast for muted text and borders.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Markdown rendering breaks message bubbles | Medium | Medium | Scope `prose` styles tightly to the renderer component. Use custom overrides to strip default margins. |
| DB migration failure for `replyToId` | Low | High | Use `onDelete: SetNull` to avoid cascade issues. Test with `prisma db push --preview-feature`. |
| Query param settings routing edge cases | Low | Medium | Test: direct URL, back button, opening modal from different routes. |
| `isOnboarded` guard loops | Medium | High | Set `isOnboarded = true` as the *last* step before redirect. Add a loading state to prevent flickers. |
| Cross-conversation reply IDs | Low | High | Validate `replyToId` belongs to the same `conversationId` in the service layer. |

---

## FINAL ACCEPTANCE CRITERIA

System is considered complete when:

- [ ] Settings modal opens via `?settings=<tab>` URL param and closes on back navigation
- [ ] Profiles (username, displayName, avatar) are editable and persist to the database
- [ ] Markdown renders bold, italic, lists, code correctly in messages
- [x] Replies store `replyToId` with `onDelete: SetNull` — deleting a parent doesn't break the reply
- [ ] Onboarding runs exactly once per user (gated by `isOnboarded` flag)
- [ ] UI states cover: empty channel, loading, failed send, disconnected socket
- [ ] No schema regression or data loss on `npx prisma db push`
