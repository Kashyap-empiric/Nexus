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
- [ ] Kill Supabase locally (if possible): socket should fail auth gracefully

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
- [ ] Header shows: user avatar, username, presence indicator
- [ ] Message list loads with pagination (scroll up loads older messages)
- [ ] "Jump to bottom" button appears when scrolled up
- [ ] New messages from other user appear in real-time
- [ ] Empty conversation shows "No messages yet" prompt

### 3.4 Sending Messages
- [ ] Type in message input — send button activates when text is non-empty
- [ ] Enter sends message (desktop), Shift+Enter adds new line
- [ ] Mobile: Enter adds new line, send button sends
- [ ] Sent message appears immediately (optimistic update with `pending: true`)
- [ ] Clock icon shown while pending, checkmark once sent
- [ ] Double blue checkmark when recipient has read the message
- [ ] User B's browser: message appears in real-time
- [ ] Emoji picker: click emoji → inserted into input at cursor position

### 3.5 Markdown Rendering
- [ ] Send `**bold**` — renders as bold
- [ ] Send `*italic*` — renders as italic
- [ ] Send `` `code` `` — renders as inline code
- [ ] Send code block (triple backticks) — renders as code block with copy button
- [ ] Send `> quote` — renders as blockquote with left accent border
- [ ] Send `- list item` — renders as unordered list
- [ ] Send `1. numbered` — renders as ordered list
- [ ] Send `[link](url)` — renders as clickable link opening in new tab

### 3.6 Editing Messages
- [ ] Hover own message — edit icon appears
- [ ] Click edit — message becomes a textarea with current content
- [ ] Edit content, press Enter or click Save — message updates instantly
- [ ] `(edited)` label appears next to edited message content
- [ ] Press Escape — edit cancelled, message restored
- [ ] User B's browser: sees updated message in real-time

### 3.7 Deleting Messages
- [ ] Hover own message — delete icon appears
- [ ] Click delete — confirmation dialog appears
- [ ] Confirm — message shows "This message was deleted."
- [ ] User B's browser: sees deleted state in real-time
- [ ] Try to delete another user's message — option should not appear

### 3.8 Read Receipts
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
- [ ] Click workspace icon — switches to workspace mode

### 4.3 Workspace Header
- [ ] Workspace header shows workspace name with dropdown
- [ ] Dropdown contains "Invite People" option
- [ ] Name is truncated if too long

### 4.4 Channel List (Sidebar)
- [ ] Sidebar shows channel list when in workspace mode
- [ ] Each channel shows `# name` format
- [ ] Channels split into public/private sections
- [ ] Active channel is highlighted
- [ ] Click "+" button to create a new channel

### 4.5 Creating Channels
- [ ] Click "+" by "Channels" header — modal opens
- [ ] Public/Private toggle works
- [ ] Enter channel name, click Create — channel appears in sidebar
- [ ] All workspace members are auto-joined to new public channels
- [ ] Private channels only show creator as member

### 4.6 Channel View
- [ ] Header shows `#` icon, channel name, workspace name
- [ ] Sending messages in channel works identically to DMs
- [ ] Edit/delete messages in channels works identically to DMs
- [ ] Messages appear in real-time for all workspace members

### 4.7 Workspace Members
- [ ] Click Members in InfoPanel or sidebar — member list appears
- [ ] Shows all members with presence indicators
- [ ] Online members shown first, then offline
- [ ] Role badges (OWNER crown, ADMIN crown)
- [ ] Click member — starts DM with that member

### 4.8 Member Removal
- [ ] OWNER/ADMIN can remove members
- [ ] Cannot remove OWNER
- [ ] Member gets MEMBER_REMOVED notification
- [ ] Removed member can no longer access workspace channels

---

## 5. Real-Time Events (Socket)

### 5.1 Message Events
- [ ] User A sends message → User B receives `message:new`
- [ ] User A edits message → User B receives `message:update` immediately
- [ ] User A deletes message → User B receives `message:delete` immediately

### 5.2 Conversation Events
- [ ] User A creates new DM → User C receives `conversation:new`
- [ ] User A creates new channel → all online members receive notification

### 5.3 Presence Events
- [ ] User A comes online → User B sees `user:online` → green dot appears
- [ ] User A goes offline → User B sees `user:offline` → green dot disappears
- [ ] Multi-tab: opening a second tab keeps user online; closing both goes offline

### 5.4 Notification Events
- [ ] User A sends invite to User B → User B receives `notification:new`
- [ ] Bell badge increments
- [ ] User B clicks notification → navigated to invite page

---

## 6. Notifications

### 6.1 Bell Popover
- [ ] Bell icon shows in top bar
- [ ] Unread badge shows count (0 if none)
- [ ] Click bell — popover opens with recent notifications
- [ ] Each notification shows: icon, title, body, timestamp
- [ ] Click notification → navigates to link + marks as read
- [ ] "Mark all as read" — marks all as read
- [ ] "View all" → navigates to `/notifications`
- [ ] Close on click outside or Escape

### 6.2 Notifications Page
- [ ] Visit `/notifications` — full page with paginated list
- [ ] Infinite scroll loads more notifications
- [ ] Empty state: "No activity yet"
- [ ] Each type shows correct icon (Mail, UserCheck, UserPlus, Hash)
- [ ] Unread items visually distinct from read items

### 6.3 Notification Types
- [ ] **INVITE_RECEIVED**: "Workspace invite" — "You've been invited to {workspace} by {inviter}"
- [ ] **INVITE_ACCEPTED**: "{username} joined" — "{user} accepted your invite to {workspace}"
- [ ] **CHANNEL_CREATED**: "New channel" — "#{channel} was created in {workspace}"
- [ ] **MEMBER_REMOVED**: "Removed from workspace" — notification received by removed user

### 6.4 Real-time Notification Delivery
- [ ] User A invites User B to a workspace via username
- [ ] User B sees notification appear instantly (no page refresh)
- [ ] Unread count increments in bell badge
- [ ] Notification appears in bell popover
- [ ] Notification appears at top of notifications page

### 6.5 Push Notifications
- [ ] Service Worker registered (`/sw.js` visible in DevTools → Application → Service Workers)
- [ ] Enable push notifications in settings
- [ ] Browser asks for notification permission → grant
- [ ] Verify `POST /notifications/push/subscribe` is called with subscription object
- [ ] Close all browser tabs for User B
- [ ] User A sends invite/channel create — User B receives desktop push notification
- [ ] Click push notification → app opens/focuses and navigates to correct URL

### 6.6 Notification Preferences
- [ ] Settings → Notifications tab has push toggle
- [ ] DM notifications toggle
- [ ] Mention notifications toggle
- [ ] Channel notifications toggle
- [ ] Toggle changes persist across page reload
- [ ] Disabling push stops push notifications (but in-app still works)

---

## 7. Invites

### 7.1 Generating Invites
- [ ] Generate invite for a workspace — returns token and invite path
- [ ] Batch invite multiple users by email — all invited
- [ ] Invite by username — user found and invited
- [ ] Check that existing active invites (same creator + entity <24h) are reused

### 7.2 Invite Modal
- [ ] Type email/username in invite modal — debounced search shows results
- [ ] Click search result — added as chip/tag
- [ ] Multiple users can be added as chips
- [ ] Chips are removable with × button
- [ ] Backspace in empty input removes last chip
- [ ] Submit button shows count: "Invite N users"
- [ ] Success toast shows count of invited users
- [ ] Skipped users shown with reason

### 7.3 Resolving Invites
- [ ] Open invite link while logged in — resolves immediately
- [ ] Open invite link while logged out — stored in sessionStorage, resolves after login
- [ ] Resolve expired invite — error shown
- [ ] Resolve max-use invite — error shown
- [ ] Duplicate resolve — gracefully handled

### 7.4 Invite Side Effects
- [ ] After resolving workspace invite — user added to workspace + #general channel
- [ ] INVITE_ACCEPTED notification sent to inviter
- [ ] MEMBER_JOINED notification sent to existing members

---

## 8. Settings

### 8.1 Profile Settings
- [ ] Open settings → Profile tab
- [ ] Shows current avatar, username, displayName
- [ ] Avatar URL input updates avatar preview
- [ ] Username validation (min 3, max 30 chars)
- [ ] Save changes — profile updates across the app
- [ ] Success toast shown
- [ ] Cancel/discard works

### 8.2 Appearance Settings
- [ ] Theme selector: Dark / Light / System
- [ ] Click Dark — app switches to dark theme
- [ ] Click Light — app switches to light theme
- [ ] Click System — follows OS preference
- [ ] Theme persists across page reload

### 8.3 Notification Settings
- [ ] Push notifications toggle
- [ ] DM notifications toggle
- [ ] Mention notifications toggle
- [ ] Channel notifications toggle
- [ ] Toggles show current state from server
- [ ] Changes persist across page reload

### 8.4 Settings Modal
- [ ] Open from anywhere (sidebar or navigation rail)
- [ ] Tabs switch between Profile, Appearance, Notifications
- [ ] Close with × button, Escape, or click outside
- [ ] Mobile responsive layout

---

## 9. Edge Cases

### 9.1 Rate Limiting
- [ ] Send messages rapidly (>10 in 10 seconds) — "sending too quickly" error toast
- [ ] Subscribe/unsubscribe push rapidly — push rate limiter kicks in
- [ ] After rate limit expires, normal operation resumes

### 9.2 Optimistic Updates
- [ ] Send a message while offline — message appears with clock icon
- [ ] Reconnect — pending messages resolve or show error
- [ ] Edit a message while offline — edit appears instantly

### 9.3 Pagination
- [ ] Scroll up in a conversation with many messages — older messages load
- [ ] "Loading older messages..." indicator shows during fetch
- [ ] After loading all messages, no more fetch attempts

### 9.4 Error Handling
- [ ] Try to access conversation you're not a member of — 403 error
- [ ] Try to edit another user's message — 403 error
- [ ] Try to edit a deleted message — 400 error
- [ ] Invalid UUID in route — validation error
- [ ] Empty message content — validation error

---

## 10. Regression Checklist

Test these after any code change:

- [ ] Can log in and see DM list
- [ ] Can send, edit, delete messages
- [ ] Other users see changes in real-time
- [ ] Can create and navigate workspaces
- [ ] Channels appear in sidebar, messages work in channels
- [ ] Presence indicators work correctly
- [ ] Invites can be generated and resolved
- [ ] Notification bell shows badge and popover
- [ ] Push notifications arrive when browser is closed
- [ ] Settings persist and function correctly
- [ ] No console errors
- [ ] TypeScript compiles cleanly

---

## Known Bugs (Still Open)

Refer to `bugs-found.md` for current status:

- Channel read receipts not fully working
- Non-transactional reads in `editMessage`
- CreateChannelModal redirects to wrong URL
- Channel list polls instead of using socket events
- Push subscription lifecycle not fully handled
