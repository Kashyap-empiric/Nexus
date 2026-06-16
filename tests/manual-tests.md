# Nexus Manual Tests

> Run both the server (`cd server && npm run dev`) and client (`cd client && npm run dev`) before testing.
> You'll need **two browser windows** (or incognito/alternative browser) logged in as **two different users** to complete most tests.

---

## 1. Authentication

### 1.1 Registration
1. Navigate to `/register`
2. Enter email, password, and display name
3. Submit the form
4. **Expected:** Redirected to the app, logged in, sidebar appears

### 1.2 Login
1. Navigate to `/login`
2. Enter credentials for an existing account
3. Submit
4. **Expected:** Redirected to the app, existing conversations load

### 1.3 GitHub OAuth
1. On `/login` or `/register`, click "Sign in with GitHub"
2. Complete the OAuth flow
3. **Expected:** Redirected back to the app, authenticated

### 1.4 Logout
1. Click the user settings / profile area
2. Click "Sign Out"
3. **Expected:** Redirected to `/login`, Supabase session cleared, socket disconnected

### 1.5 Token Expiry / Refresh
1. Wait for the session to expire (or manually invalidate the token)
2. Perform any API action (send a message, load conversations)
3. **Expected:** Token refreshes silently OR user is redirected to login

### 1.6 Protected Route Redirect
1. While logged out, navigate to `/conversations`
2. **Expected:** Redirected to `/login` or `/register`

---

## 2. Direct Messages

### 2.1 New DM via Plus Button
1. In the left sidebar, under **Direct Messages**, click the **`+`** icon
2. **Expected:** `NewConversationModal` appears with a list of suggested users
3. Click a user from the suggested list
4. **Expected:** DM conversation opens, initial message input is focused

### 2.2 New DM via User Search
1. Open the `NewConversationModal`
2. Type into the search input
3. **Expected:** Results filter as you type, matching users appear
4. Click a user
5. **Expected:** DM created/opened for that user

### 2.3 DM Deduplication
1. Open a DM with User B (from User A)
2. From User B's account, open a DM with User A
3. **Expected:** The same conversation opens — no duplicate created

### 2.4 DM from User Profile
1. Navigate to `/users/:id` for another user
2. Click the "Message" button
3. **Expected:** DM created/opened with that user

### 2.5 Conversation List Updates in Real Time
1. User A opens a DM with User B
2. From User B's account, observe the sidebar
3. **Expected:** The new conversation appears in User B's sidebar immediately (without refresh)

---

## 3. Messaging

### 3.1 Send a Text Message
1. Open a conversation
2. Type in the message input and press Enter
3. **Expected:** Message appears instantly in the chat (optimistic update), persists on reload

### 3.2 Receive Message in Real Time
1. User A sends a message in their shared conversation
2. Observe User B's window
3. **Expected:** Message appears in User B's chat immediately (no refresh needed)

### 3.3 Edit a Message
1. Hover over one of your own messages
2. Click the edit (pencil) icon
3. Modify the text and save
4. **Expected:** Message content updates in-place for both users, `(edited)` indicator shown

### 3.4 Delete a Message
1. Hover over one of your own messages
2. Click the delete (trash) icon
3. Confirm deletion
4. **Expected:** Message shows "[deleted]" or is removed for both users

### 3.5 Cannot Edit/Delete Another User's Message
1. Hover over another user's message
2. **Expected:** No edit/delete controls appear

### 3.6 Reply to a Message
1. Hover over a message and click the reply icon
2. **Expected:** A reply preview appears above the input
3. Type and send a reply
4. **Expected:** Reply renders with a quoted/referenced block of the original message, visible to both users

### 3.7 Cancel a Reply
1. Start a reply (see 3.6)
2. Click the "X" on the reply preview
3. **Expected:** Reply preview dismissed, input returns to normal

### 3.8 Cursor Pagination (Load More)
1. Scroll up in a conversation with many messages
2. **Expected:** Older messages load in as you scroll (infinite scroll), no duplicates

### 3.9 Optimistic Update on Slow Network
1. Simulate slow network (DevTools > Network > throttling)
2. Send a message
3. **Expected:** Message appears immediately in the UI, shows a "sending" or pending state until confirmed

---

## 4. Read Receipts & Unread Counts

### 4.1 Unread Badge on Conversation
1. User A sends a message in their shared DM
2. User B has the conversation unopened
3. **Expected:** User B sees an unread badge on that conversation in the sidebar

### 4.2 Unread Badge Clears on Open
1. User B opens the conversation with the unread badge
2. **Expected:** Badge disappears, conversation marked as read

### 4.3 Read Receipt on Messages
1. Both users have the conversation open
2. User A sends a message
3. User B scrolls to view it
4. **Expected:** Under the message (or in the footer), User A sees that User B has read it

### 4.4 Multi-Conversation Unread
1. User A sends messages in two different conversations with User B
2. **Expected:** Both conversations show unread badges for User B

---

## 5. Presence (Online Status)

### 5.1 Online Indicator
1. Log in as User A and User B in separate windows
2. **Expected:** Both users see each other as online (green dot on avatar)

### 5.2 Offline Indicator
1. User B closes their window / disconnects
2. **Expected:** Within a few seconds, User B's indicator turns gray for User A

### 5.3 Multi-Tab Persistence
1. User B opens a second tab
2. **Expected:** User B remains online (green dot) — only goes offline when ALL tabs close

### 5.4 Initial Presence Load
1. With User A already logged in, User B logs in
2. **Expected:** User B sees User A's online status immediately on connection

### 5.5 Status Selection
1. Click your avatar / status area
2. Select a status: AWAY, DND, INVISIBLE
3. **Expected:** 
   - AWAY: yellow indicator for others
   - DND: red indicator for others
   - INVISIBLE: gray indicator (appear offline)

### 5.6 Custom Status Text
1. Set a custom status text (e.g., "In a meeting")
2. **Expected:** Status text shows under your name for other users

---

## 6. Typing Indicators

### 6.1 Typing Notification
1. Both users in the same conversation
2. User B starts typing in the input
3. **Expected:** User A sees a "[User B] is typing..." indicator

### 6.2 Typing Stops
1. User B stops typing (or sends a message)
2. **Expected:** The typing indicator disappears for User A

### 6.3 Multi-User Typing
1. Have 3+ users in a channel conversation
2. Two users type simultaneously
3. **Expected:** Indicators show both users, e.g., "User B and User C are typing..."

---

## 7. Workspaces

### 7.1 Create Workspace
1. Click the "Create Workspace" button (bottom of nav rail)
2. Enter a name and slug
3. Submit
4. **Expected:** Workspace created, you join as OWNER, `#general` channel is auto-created, you're redirected to it

### 7.2 Workspace Navigation
1. Click between workspaces in the nav rail
2. **Expected:** Sidebar updates to show that workspace's channels, active channel loads

### 7.3 Create Channel
1. Inside a workspace, click the `+` next to Channels
2. Enter a name, choose PUBLIC or PRIVATE
3. Submit
4. **Expected:** Channel created, all workspace members notified, channel appears in sidebar

### 7.4 Channel Unread Badges
1. User A posts in a channel
2. User B does not have that channel open
3. **Expected:** Unread badge appears on the channel in User B's sidebar, and aggregated on the workspace icon

### 7.5 Invite User to Workspace
1. Click "Invite" in workspace header
2. Enter a username or email of User B
3. Submit
4. **Expected:** User B receives an invite notification

### 7.6 Batch Invite Users
1. Use the batch invite feature with multiple user IDs
2. **Expected:** All invited users receive notifications

### 7.7 Accept Invite via Link
1. Generate an invite link for a workspace
2. Open the link while logged in as a different user
3. **Expected:** You join the workspace, see its channels

### 7.8 Role Change
1. As workspace OWNER, change a member's role to ADMIN
2. **Expected:** Role updates, member sees updated role

### 7.9 Remove Member
1. As workspace OWNER or ADMIN, remove a member
2. **Expected:** Member is removed from workspace, can no longer access channels

### 7.10 Cannot Delete #general
1. Try to delete the `#general` channel
2. **Expected:** Request fails, `#general` cannot be deleted

### 7.11 Delete Channel
1. Delete a non-general channel
2. **Expected:** Channel removed for all members

---

## 8. Notifications

### 8.1 In-App Notification for Invite
1. User A invites User B to a workspace
2. **Expected:** User B sees a notification in the bell icon dropdown

### 8.2 Notification Badge
1. User B has unread notifications
2. **Expected:** Bell icon shows unread count badge

### 8.3 Mark Notification as Read
1. Open the notification dropdown
2. Click a single notification
3. **Expected:** Notification marked as read, count decreases

### 8.4 Mark All Notifications as Read
1. Click "Mark all as read"
2. **Expected:** All notifications cleared, badge disappears

### 8.5 Notification for Channel Creation
1. User A creates a new channel in a shared workspace
2. **Expected:** User B receives a notification

### 8.6 Notification for Member Join
1. User B is invited and accepts
2. **Expected:** Other members receive a notification

### 8.7 Notification Preferences
1. Navigate to `/settings/notifications`
2. Toggle push notifications, DM notifications, mention notifications, channel notifications
3. **Expected:** Preferences saved and respected

---

## 9. Rate Limiting

### 9.1 Message Rate Limiting (Socket)
1. Rapidly send 11+ messages in a short burst (within 10 seconds)
2. **Expected:** After 10 messages, further sends return an error "sending too quickly" / messages are rejected

### 9.2 Message Rate Limiting (REST)
1. Rapidly POST/PATCH/DELETE messages (>20 in 1 minute)
2. **Expected:** Returns 429 "Sending too quickly"

### 9.3 General Rate Limiting
1. Make >1000 requests to any `/api/*` endpoint within 15 minutes
2. **Expected:** Returns 429 "Too many requests"

### 9.4 Push Subscription Rate Limiting
1. Rapidly subscribe/unsubscribe to push notifications (>5 in 1 minute)
2. **Expected:** Returns 429 "Too many push requests"

### 9.5 Rate Limit Error Display
1. Trigger a 429 (client-side)
2. **Expected:** A toast notification appears: "Too many requests. Please slow down."

---

## 10. User Profile & Settings

### 10.1 View Own Profile
1. Click on your avatar or navigate to settings
2. **Expected:** See your username, fullName, bio, avatar, status

### 10.2 Edit Profile
1. Change username, fullName, and bio
2. Submit
3. **Expected:** Changes persist on reload, visible to other users in real time

### 10.3 Upload Avatar
1. Upload an avatar image
2. **Expected:** Avatar updates immediately for you and other users

### 10.4 View Another User's Profile
1. Navigate to `/users/:id`
2. **Expected:** See their avatar, status, bio, and a "Message" button

### 10.5 Search Users
1. Use the search in NewConversationModal or a global search
2. **Expected:** Results match by username or fullName

---

## 11. Invites

### 11.1 Generate Invite Link
1. Open the InviteModal for a workspace, channel, conversation, or user
2. Copy the generated link
3. **Expected:** Link is valid, includes a token

### 11.2 Resolve Invite Link
1. Open the invite link in a browser
2. **Expected:** InviteProcessor resolves the token, redirects to the appropriate workspace/channel/conversation

### 11.3 Expired/Revoked Invite
1. Revoke an invite or let it expire
2. Open the invite link
3. **Expected:** Error message: invite invalid or expired

### 11.4 Max Uses Invite
1. Generate an invite with `maxUses: 1`
2. Use it once
3. **Expected:** Second use fails (link exhausted)

---

## 12. Info Panel

### 12.1 DM Info Panel
1. Open a DM conversation
2. Toggle the InfoPanel (info icon in header)
3. **Expected:** Shows the other user's profile, shared files (if any)

### 12.2 Channel Info Panel
1. Open a workspace channel
2. Toggle the InfoPanel
3. **Expected:** Shows channel description, member list, pinned messages

### 12.3 Member List in Channel
1. Open the channel InfoPanel
2. View members
3. **Expected:** All channel members listed with online indicators

---

## 13. Socket Connection & Reconnection

### 13.1 Initial Socket Connection
1. Log in
2. **Expected:** Socket connects, presence initial data received, online users populate

### 13.2 Reconnection on Network Loss
1. Disconnect your network (DevTools > Network > Offline)
2. **Expected:** Socket status changes to "disconnected"
3. Reconnect the network
4. **Expected:** Socket reconnects automatically, state resyncs

### 13.3 Auth Failure on Socket
1. Invalidate your JWT token
2. Force a socket reconnect
3. **Expected:** Socket rejects with auth error

---

## 14. Edge Cases

### 14.1 Empty Message
1. Try sending an empty or whitespace-only message
2. **Expected:** Send button is disabled or message is rejected

### 14.2 Very Long Message
1. Send a message with >10,000 characters
2. **Expected:** Either sent successfully or gracefully rejected with a clear message

### 14.3 Concurrent Message Send
1. Both users send a message at nearly the same time
2. **Expected:** Both messages appear, no lost messages, order is consistent

### 14.4 Offline Message Queue (if implemented)
1. Disconnect network
2. Type and send a message
3. **Expected:** Message queued locally, sent when connection restores

### 14.5 Browser Back/Forward
1. Navigate between conversations
2. Use browser back/forward buttons
3. **Expected:** Navigation works correctly, no full page reloads

### 14.6 Direct URL Navigation
1. Copy a conversation URL and open it in a new tab
2. **Expected:** Correct conversation loads, sidebar reflects active state

### 14.7 Responsive Layout
1. Resize the browser to mobile widths
2. **Expected:** Layout adapts (sidebar becomes drawer, panels stack), all functionality remains accessible

---

## 15. Data Persistence

### 15.1 Message Persistence
1. Send messages in a conversation
2. Refresh the page
3. **Expected:** All messages still present, in the correct order

### 15.2 Unread Badge Persistence
1. Get an unread badge on a conversation
2. Refresh the page without opening it
3. **Expected:** Unread badge persists after refresh

### 15.3 Conversation List Persistence
1. Create several conversations
2. Refresh the page
3. **Expected:** All conversations shown in the sidebar

---

## 16. Concurrent Multi-User Scenarios

### 16.1 Three-Way Messaging (Channel)
1. Create a channel with 3 members
2. All 3 send messages in sequence
3. **Expected:** All messages appear for all members in the correct chronological order

### 16.2 Simultaneous Edit
1. User A sends a message
2. Users B and C both try to edit the same message (only A should be able to)
3. **Expected:** Only User A sees edit controls

### 16.3 Join Channel Mid-Conversation
1. User A and B have a long conversation in a channel
2. User C joins the workspace and the channel
3. **Expected:** User C sees recent messages (by cursor pagination) but not the full history until scrolling up

---

## 17. Workspace-Scoped Conversations

### 17.1 Same Channel Name Across Workspaces
1. Create a channel named `#random` in two different workspaces
2. Switch between workspaces
3. **Expected:** Each workspace shows its own `#random` channel with its own messages

### 17.2 Workspace-Scoped Search
1. Search for users while in a workspace
2. **Expected:** Results prioritize workspace members

### 17.3 Leave Workspace
1. Remove yourself from a workspace (or have an owner remove you)
2. **Expected:** Workspace disappears from your nav rail, you cannot access its channels

---

## 18. Accessibility

### 18.1 Keyboard Navigation
1. Tab through the app
2. **Expected:** All interactive elements reachable, focus indicators visible

### 18.2 Screen Reader
1. Enable a screen reader
2. Navigate conversations and send messages
3. **Expected:** ARIA labels present, roles correct, announcements for new messages

---

## Summary Checklist

| Area                    | Pass | Fail | Notes |
|-------------------------|------|------|-------|
| Registration/Login      | ☐    | ☐    |       |
| OAuth                   | ☐    | ☐    |       |
| Logout                  | ☐    | ☐    |       |
| Create DM               | ☐    | ☐    |       |
| Send Message            | ☐    | ☐    |       |
| Real-time Receive       | ☐    | ☐    |       |
| Edit Message            | ☐    | ☐    |       |
| Delete Message          | ☐    | ☐    |       |
| Reply to Message        | ☐    | ☐    |       |
| Read Receipts           | ☐    | ☐    |       |
| Unread Badges           | ☐    | ☐    |       |
| Online/Offline Presence | ☐    | ☐    |       |
| Status Selection        | ☐    | ☐    |       |
| Typing Indicators       | ☐    | ☐    |       |
| Create Workspace        | ☐    | ☐    |       |
| Create Channel          | ☐    | ☐    |       |
| Invite to Workspace     | ☐    | ☐    |       |
| User Profiles           | ☐    | ☐    |       |
| Avatar Upload           | ☐    | ☐    |       |
| Notifications           | ☐    | ☐    |       |
| Invite Links            | ☐    | ☐    |       |
| Rate Limiting           | ☐    | ☐    |       |
| Socket Reconnection     | ☐    | ☐    |       |
| Data Persistence        | ☐    | ☐    |       |
| Responsive Layout       | ☐    | ☐    |       |
| Keyboard Navigation     | ☐    | ☐    |       |
