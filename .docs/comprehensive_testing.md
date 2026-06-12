# Comprehensive Manual Testing Guide

> **Purpose**: Work through this guide step-by-step to manually test every feature in Nexus.
> Run tests in two browser windows (User A + User B) to test real-time features.
> Check the browser console (F12 → Console) for any errors during testing.

---

## 1. Authentication & Authorization

### 1.1 Registration
- [ ] Visit `/register` — form renders with username, email, password, confirm password
- [ ] Submit empty form — validation errors shown
- [ ] Register with valid details — account created, redirected to `/login` or `/conversations`
- [ ] Check email confirmation flow if enabled
- [ ] Register with same email twice — error shown (duplicate)
- [ ] GitHub OAuth login — redirected to GitHub, then back to app

### 1.2 Login
- [ ] Visit `/login` — form renders with email, password, "Forgot password?" link
- [ ] Login with invalid credentials — error shown
- [ ] Login with valid credentials — redirected to `/conversations`
- [ ] Login with unconfirmed email — appropriate message shown
- [ ] After login: sidebar shows correct username, avatar, online status

### 1.3 Logout
- [ ] Click profile Logout button — redirected to `/login`
- [ ] After logout: visiting `/conversations` redirects to `/login`
- [ ] After logout: stored state is cleared (socket disconnected, query cache cleared)

### 1.4 Forgot Password
- [ ] Visit `/forgot-password` — form renders
- [ ] Submit with valid email — "Reset link sent" message shown
- [ ] Submit with invalid email — error shown

### 1.5 Protected Routes
- [ ] Visit `/conversations` while logged out — redirects to `/login`
- [ ] Visit `/workspaces/:slug/channels/:channelId` while logged out — redirects to `/login`
- [ ] Visit `/login` while logged in — redirects to `/conversations`

---

## 2. Socket Connection

### 2.1 Connection Lifecycle
- [ ] On login: socket connects (check `SocketProvider` console logs)
- [ ] Status indicator shows "Online" when connected
- [ ] Status indicator shows "Connecting..." during reconnection
- [ ] Status indicator shows "Offline" when disconnected
- [ ] Kill server: browser shows "Connection lost" toast
- [ ] Restart server: socket reconnects automatically, status returns to "Online"

### 2.2 Auth on Socket
- [ ] Open browser console, verify no `[Socket] Auth error` messages
- [ ] Verify socket handshake includes valid JWT token
- [ ] Kill Supabase locally (if possible): socket should fail auth gracefully (Bug 10 fix)

---

## 3. Direct Messages

### 3.1 DM List (Sidebar)
- [ ] Sidebar shows all DM conversations sorted by `updatedAt` (most recent first)
- [ ] Each DM shows: user avatar, username, last message preview, unread badge
- [ ] Search input filters DMs by username
- [ ] Empty state shows "Nothing here yet" when no DMs exist
- [ ] DMs with deleted users and no messages are hidden

### 3.2 Creating a New DM
- [ ] Click "New" → "New Message" — modal opens with user search
- [ ] Search for a user by name — results appear
- [ ] Click a user — DM created (or existing DM opened)
- [ ] Verify `dmPair` prevents duplicate DMs (same pair opens existing conversation)

### 3.3 DM View
- [ ] Click a DM in sidebar — opens conversation view
- [ ] Header shows: user avatar, username, presence indicator (green dot if online)
- [ ] Message list loads with pagination (scroll up loads older messages)
- [ ] "Jump to bottom" button appears when scrolled up
- [ ] New messages from other user appear in real-time
- [ ] Empty conversation shows "No messages yet" prompt
- [ ] Send the first message — "No messages yet" prompt disappears, message appears

### 3.4 Sending Messages
- [ ] Type in message input — send button activates when text is non-empty
- [ ] Enter sends message (desktop), Shift+Enter adds new line
- [ ] Mobile: Enter adds new line, send button sends
- [ ] Sent message appears immediately (optimistic update with `pending: true`)
- [ ] Clock icon shown while pending, checkmark once sent
- [ ] Double blue checkmark when recipient has read the message
- [ ] User B's browser: message appears in real-time
- [ ] Emoji picker: click emoji → inserted into input at cursor position

### 3.5 Editing Messages
- [ ] Hover own message — edit icon appears (desktop)
- [ ] Click edit — message becomes a textarea with current content
- [ ] Edit content, press Enter or click Save — message updates instantly
- [ ] `(edited)` label appears next to edited message content
- [ ] Press Escape — edit cancelled, message restored
- [ ] User B's browser: sees updated message in real-time (no delay — Bug 1 fix)
- [ ] Edit a message that's been deleted — should show error

### 3.6 Deleting Messages
- [ ] Hover own message — delete icon appears (desktop)
- [ ] Click delete — confirmation dialog appears
- [ ] Confirm — message shows "This message was deleted."
- [ ] User B's browser: sees deleted state in real-time
- [ ] Try to delete another user's message — option should not appear

### 3.7 Read Receipts
- [ ] User A sends message to User B
- [ ] User B opens the conversation — User A sees double blue checkmark
- [ ] User B has not opened conversation — User A sees single checkmark
- [ ] Unread count updates correctly for both users

---

## 4. Workspaces

### 4.1 Creating Workspaces
- [ ] Click "+" in navigation rail — modal opens
- [ ] Enter workspace name and slug — slug auto-generates from name
- [ ] Submit — workspace created with a "general" channel
- [ ] New workspace appears in navigation rail
- [ ] After creation, auto-switches to workspace mode and opens "general" channel

### 4.2 Workspace Navigation
- [ ] Navigation rail shows all user's workspaces
- [ ] Each workspace shows initials or uploaded image
- [ ] Active workspace has a highlighted indicator bar
- [ ] Click DM icon — switches to DM mode
- [ ] Click workspace icon — switches to workspace mode, opens last-visited channel
- [ ] First visit to workspace — auto-redirects to "general" channel

### 4.3 Workspace Header
- [ ] Workspace header shows workspace name with dropdown
- [ ] Dropdown contains "Invite People" option
- [ ] Name is truncated if too long

### 4.4 Channel List (Sidebar)
- [ ] Sidebar shows channel list when in workspace mode
- [ ] Each channel shows `# name` format
- [ ] Active channel is highlighted
- [ ] Search input filters channels by name
- [ ] Click "+" button to create a new channel

### 4.5 Creating Channels
- [ ] Click "+" by "Channels" header — modal opens
- [ ] Enter channel name, click Create — channel appears in sidebar
- [ ] All workspace members are auto-joined to the new public channel
- [ ] After creation, redirected to the workspace channel URL (`/workspaces/{slug}/channels/{id}`)
      **Known bug**: currently redirects to `/conversations/{id}` instead
- [ ] Try creating a channel with a name that's too long (30 char max)
- [ ] Try creating channel with empty name — button disabled

### 4.6 Workspace Channel View
- [ ] Click a channel in sidebar — opens channel view
- [ ] Header shows: `#` icon, channel name, workspace name below
- [ ] Sending messages in channel works identically to DMs
- [ ] Edit/delete messages in channels works identically to DMs
- [ ] Messages appear in real-time for all workspace members in the channel

---

## 5. Real-Time Events (Socket)

### 5.1 Message Events
- [ ] User A sends message → User B receives `message:new` (console: `SOCKET_EVENTS.MESSAGE_NEW`)
- [ ] User A edits message → User B receives `message:update` immediately (Bug 1 fix)
- [ ] User A deletes message → User B receives `message:delete` immediately (Bug 1 fix)
- [ ] User A edits latest message → User B sees sidebar update via `conversation:update`

### 5.2 Conversation Events
- [ ] User A creates new DM with User C → User C receives `conversation:new` with room join
- [ ] User A creates new workspace channel → all online members receive `conversation:new`
- [ ] New channel appears in sidebar without page refresh
- [ ] Edited/deleted latest message updates sidebar preview (via `conversation:update`)

### 5.3 Presence Events
- [ ] User A comes online → User B sees `user:online` event → green dot appears
- [ ] User A goes offline → User B sees `user:offline` event → green dot disappears
- [ ] On connection, `presence:initial` populates the online users set
- [ ] Multi-tab: opening a second tab keeps user online; closing both goes offline

### 5.4 Invite Events
- [ ] User A generates invite for a conversation
- [ ] User B resolves invite → User A sees `conversation:update` (verify Bug 6 fix)
- [ ] Check console: event emitted as `"conversation:update"` not `"CONVERSATION_UPDATE"`

### 5.5 Unread Count Persistence (Bug 11 fix)
- [ ] User B has unread messages in a conversation
- [ ] A `conversation:update` event arrives (e.g., User A edits a message)
- [ ] User B's unread count should NOT reset to 0
- [ ] Verify: sidebar still shows the unread badge after the update event

---

## 6. Messages — Edge Cases

### 6.1 Rate Limiting
- [ ] Send messages rapidly (>10 in 10 seconds) — "sending too quickly" error toast
- [ ] Rate limiter only applies to message sending, not other actions
- [ ] After rate limit window expires, sending works again

### 6.2 Optimistic Updates
- [ ] Send a message while offline (disconnect network) — message appears with clock icon
- [ ] Reconnect — pending messages resolve or show error
- [ ] Edit a message while offline — edit appears instantly, resolves on reconnect
- [ ] Delete a message while offline — delete appears instantly, resolves on reconnect

### 6.3 Long Messages
- [ ] Send a message with very long content (2000 chars) — works
- [ ] Send with exactly 2000 chars — works
- [ ] Send with >2000 chars — validation error

### 6.4 Pagination
- [ ] Scroll up in a conversation with many messages — older messages load
- [ ] "Loading older messages..." indicator shows during fetch
- [ ] After loading all messages, no more fetch attempts

### 6.5 Concurrency
- [ ] User A and User B edit the same message simultaneously — last write wins
- [ ] User A deletes message while User B is editing it — User B's edit fails
- [ ] User A sends message while offline — User B sends in same conversation — order is maintained

---

## 7. Invites

### 7.1 Generating Invites
- [ ] Generate invite for a conversation — returns token and invite path
- [ ] Generate invite for a workspace — returns token and invite path
- [ ] Check that existing active invites (same creator + entity <24h) are reused

### 7.2 Resolving Invites
- [ ] Open invite link while logged in — resolves immediately, redirects to conversation/workspace
- [ ] Open invite link while logged out — stored in sessionStorage, resolves after login
- [ ] Resolve expired invite — error shown
- [ ] Resolve max-use invite — error shown
- [ ] Resolve revoked invite — error shown
- [ ] Duplicate resolve — gracefully handles (P2002 constraint)

### 7.3 Invite Side Effects
- [ ] After resolving workspace invite — user added to workspace, joined to "general" channel
- [ ] After resolving channel invite — user added to channel members
- [ ] Other workspace members see new member via socket event (verify Bug 6 fix)

---

## 8. Navigation & UI

### 8.1 Navigation Rail
- [ ] DM icon is active when in DM mode
- [ ] Workspace icons appear for each workspace
- [ ] Active workspace has visual indicator
- [ ] "+" button opens CreateWorkspaceModal
- [ ] Clicking DM icon switches to DM mode, clears active workspace
- [ ] Clicking workspace switches to workspace mode, opens last channel

### 8.2 Responsive Layout
- [ ] Desktop (>768px): sidebar visible, message list centered
- [ ] Mobile (<768px): sidebar hidden, back arrow in header to return
- [ ] Mobile: sidebar takes full width when open
- [ ] Message input adapts to screen width

### 8.3 Theme
- [ ] Theme toggle in conversation header switches dark/light mode
- [ ] All components properly themed (sidebar, inputs, modals, messages)
- [ ] Theme persists across page reloads

---

## 9. Error Handling

### 9.1 Server Errors
- [ ] Kill server — UI shows "Connection lost" toast via socket `connect_error`
- [ ] Make API call while server is down — appropriate error toast shown
- [ ] Restart server — socket reconnects, normal operation resumes

### 9.2 API Errors
- [ ] Try to access conversation you're not a member of — 403 error
- [ ] Try to edit another user's message — 403 error
- [ ] Try to delete another user's message — 403 error
- [ ] Try to edit a message that's been deleted — 400 error
- [ ] Try to delete a message that's already deleted — 400 error
- [ ] Invalid UUID in route — validation error
- [ ] Empty message content — validation error

### 9.3 Edge Cases
- [ ] User A deletes their account — User B sees "Deleted user" in sidebar
- [ ] DM with deleted user who has no messages — hidden from sidebar
- [ ] Navigate directly to non-existent conversation ID — "Conversation not found"
- [ ] Workspace slug with invalid characters — slug validation error on creation

---

## 10. Workspace Membership & Permissions

### 10.1 Workspace Membership
- [ ] User not in workspace: viewing workspace returns 403
- [ ] User not in workspace:  accessing channel returns 403
- [ ] User in workspace: can view all public channels
- [ ] User not in workspace: invited via link can join

### 10.2 Role-Based Access (Database Level)
- [ ] `WorkspaceRole` enum has: `OWNER`, `ADMIN`, `MEMBER`
- [ ] `isWorkspaceMember()` correctly checks membership
- [ ] `verifyConversationMembership()` correctly checks channel access
- [ ] `checkConversationAccess()` handles public channels: accessible to any workspace member

---

## 11. Build & TypeScript

### 11.1 TypeScript Compilation
- [ ] Client: `npx tsc --noEmit` — zero errors
- [ ] Server: `npx tsc --noEmit` — zero errors

### 11.2 Build
- [ ] Client: `npm run build` or `next build` — succeeds
- [ ] Server: `npm run build` — succeeds

### 11.3 Warnings
- [ ] No `any` type casts (search for `as any` — should be minimal)
- [ ] No `@ts-ignore` comments
- [ ] No unused imports or variables

---

## 12. Regression Checklist

Test these after any code change to ensure nothing is broken:

- [ ] Can log in and see DM list
- [ ] Can send, edit, delete messages
- [ ] Other users see changes in real-time
- [ ] Can create and navigate workspaces
- [ ] Channels appear in sidebar, messages work in channels
- [ ] Presence indicators work correctly
- [ ] Invites can be generated and resolved
- [ ] Search filters conversations and users
- [ ] Unread badges don't randomly reset (Bug 11 fix — verify)
- [ ] Socket connects and stays connected
- [ ] No console errors
- [ ] TypeScript compiles cleanly

---

## Known Bugs (Still Open)

Refer to `bugs-found.md` for the current status of all known bugs:

- Bug 2: MESSAGE_UPDATE/MESSAGE_DELETE not handled at sidebar level
- Bug 4: Double cache invalidation (partially mitigated)
- Bug 7: TYPING_START/TYPING_STOP defined but never used
- Bug 8: `workspace:join` event exists on server but no client emits it
- Bug 9: Inefficient room-join loop in `dispatchConversationNew`
- Bug 12: `editMessage` uses stale `updatedAt` in conversation metadata

---

## Environment Setup for Testing

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev

# Open two browser windows
# Window 1: User A (login with account 1)
# Window 2: User B (login with account 2)
```
