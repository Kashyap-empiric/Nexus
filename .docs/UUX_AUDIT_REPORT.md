# Nexus UI/UX Audit Report — Full User Flow Analysis

**Date:** June 12, 2026  
**Scope:** Complete user-facing flow from Landing Page through authentication, chat interface, invites, and workspaces.

---

## Table of Contents

1. [Complete User Flow Map](#1-complete-user-flow-map)
2. [Step-by-Step Flow Breakdown](#2-step-by-step-flow-breakdown)
3. [Critical UI/UX Issues & Recommendations](#3-critical-uiux-issues--recommendations)
4. [Medium-Priority Improvements](#4-medium-priority-improvements)
5. [Low-Priority Polish & Nice-to-Haves](#5-low-priority-polish--nice-to-haves)
6. [Summary of Recommended Changes](#6-summary-of-recommended-changes)
7. [Implementation Plan: Workspace Member List / People Discovery](#7-implementation-plan-workspace-member-list--people-discovery)

---

## 1. Complete User Flow Map

```
Landing Page (/)
  ├── Click "Log in" → /login
  ├── Click "Sign up" → /register
  └── Click "Create a free account" → /register

Login (/login)
  ├── Email + Password submit → Supabase auth → redirect to /conversations
  ├── "Sign in with Github" → OAuth → /auth/callback → redirect to /conversations
  ├── "Forgot password?" → /forgot-password
  └── "Sign up" → /register

Register (/register)
  ├── Email + Password + Username → Supabase signup
  │   ├── If session exists → redirect to /conversations
  │   └── If no session (requires email confirmation)
  │       → redirect to /login?registered=true&confirm=true
  └── "Sign in with Github" → OAuth → /auth/callback → /conversations

Forgot Password (/forgot-password)
  └── Enter email → Supabase sends reset email → confirmation screen
      Note: Uses /auth/callback as redirectTo

Auth Callback (/auth/callback)
  └── Listens for SIGNED_IN event / checks existing session → redirect to /conversations

Invite Page (/invite?token=xxx)
  ├── Authenticated → POST /invites/resolve → redirect to conversation
  └── Unauthenticated → store token in sessionStorage → redirect to /login

Protected Route
  └── Middleware (proxy.ts) checks session
      ├── No session → redirect to /login
      └── Has session → render /conversations layout

Conversations Layout (/conversations)
  ├── NavigationRail (left: 60px)
  │   ├── DM icon (MessagesSquare)
  │   ├── Divider
  │   ├── Workspace icons (one per workspace)
  │   └── "+" button to create workspace → CreateWorkspaceModal
  ├── Sidebar (middle: 240px)
  │   ├── DM mode: search bar + DM conversations list
  │   ├── Workspace mode: WorkspaceHeader + channels list
  │   └── Bottom: User profile + logout button
  └── Main Content (right: fluid)
      ├── Index page (/conversations) → EmptyState component
      └── Conversation detail (/conversations/:id) → ActiveConversation

ActiveConversation
  ├── Header
  │   ├── Back button (mobile) with unread badge
  │   ├── DM: UserAvatar + PresenceIndicator + name
  │   ├── Channel: Hash icon + channel name + workspace name
  │   └── ThemeToggle
  ├── MessageList
  │   ├── Infinite scroll (upward)
  │   ├── Grouped messages (by user, within 1 min)
  │   ├── Inline edit / delete with confirmation
  │   ├── "Jump to bottom" button with new-message indicator
  │   └── Read receipts (double-check indicators)
  └── MessageInput
      ├── Auto-resizing textarea (max 140px)
      ├── Emoji picker popover
      ├── Send button (disabled when empty)
      ├── Enter to send (desktop) / Enter=newline (mobile)
      └── Optimistic UI (pending → confirmed)

Edge: 404 Page
  └── Ghost icon + "Page not found" + BackButton + Home link
```

---

## 2. Step-by-Step Flow Breakdown

### 2.1 Landing Page (`/`)

**What renders:**
- A sticky header with Nexus logo, "Log in" text link, "Sign up" emerald-green button
- Hero section with headline, subtitle, "Get Started" and "Learn more" buttons
- Features grid (3 cards: Real-time Messaging, Enterprise Security, Clean Interface)
- CTA section ("Ready to improve your workflow?")
- Footer with links (Documentation, Privacy, Terms) — all point to "#" (placeholder)

**Under the hood:** The LandingPage component is rendered from `app/page.tsx`. It's a static marketing page. The layout wraps it in `ThemeProvider > QueryProvider > AuthProvider > AuthGate`. Since the path is "/" and `isPublicRoute` is true, AuthGate renders children immediately without checking auth state.

### 2.2 Auth Layout (Login & Register)

**What renders:**
- On desktop (≥1024px): A split-screen layout
  - Left half: Dark sidebar (`AuthSidebar`) with a full-bleed background image, gradient overlay, and Nexus logo link
  - Right half: Centered form card
- On mobile: The auth sidebar is hidden. A floating `MobileAuthHeader` shows the Nexus logo and "Nexus" text at the top-left.

### 2.3 Login Page (`/login`)

**What renders:**
- "Welcome back" card with:
  - "Sign in with Github" button (using Supabase OAuth)
  - Divider "Or continue with"
  - Email input + Password input + "Forgot password?" link + "Sign in" submit button
  - Footer: "Don't have an account? Sign up"

**Redirection logic:**
- On success: `router.replace("/conversations")` — note `replace` not `push` to avoid back-button issues
- The `AuthProvider` also listens for `SIGNED_IN` and redirects if on an auth route
- Error display: Shows error banner if login fails
- Success flash: Shows success/confirmation banner if redirected from registration with `?registered=true&confirm=true`

### 2.4 Register Page (`/register`)

**What renders:**
- "Create an account" card with:
  - "Sign up with Github" button
  - Divider
  - Username, Email, Password, Confirm Password fields
  - "Sign up" submit button
  - Footer: "Already have an account? Sign in"

**Redirection logic:**
- If Supabase returns a session immediately: redirect to `/conversations`
- If no session (email confirmation required): redirect to `/login?registered=true&confirm=true`

### 2.5 Forgot Password (`/forgot-password`)

**What renders:**
- A full-screen centered Card (NOT wrapped in auth layout, so no sidebar)
- Email input + "Send reset link" button
- On success: Success message with the email shown
- Footer: "Remember your password? Sign in"

**Flow:** Uses Supabase `resetPasswordForEmail()` with `redirectTo` pointing to `/auth/callback`.

### 2.6 Auth Callback (`/auth/callback`)

**What renders:**
- A loading spinner + "Completing sign in..." text
- Listens for `SIGNED_IN` event on Supabase, then redirects to `/conversations`
- Also checks existing session as fallback

**Used for:** OAuth callbacks (GitHub) and password reset emails.

### 2.7 Invite Flow (`/invite?token=xxx`)

**What renders:**
- `InviteProcessor` component with a loading spinner and "Processing Invite..." text
- On the `InvitePage`, wrapped in Suspense with a fallback spinner

**Logic:**
1. Check for `token` query param — if missing, redirect to `/`
2. If user is authenticated:
   - POST to `/invites/resolve` with the token
   - On success, redirect to the URL returned by the server (e.g., `/conversations/:id`)
3. If user is unauthenticated:
   - Store token in `sessionStorage` as `nexus_invite`
   - Redirect to `/login`
4. On login completion, `AuthGate` triggers `handleInviteContinuation()` which:
   - Reads the stored token from sessionStorage
   - POSTs to `/invites/resolve`
   - Redirects to the conversation

### 2.8 Middleware / Route Protection (`proxy.ts`)

**Logic:**
- Checks if protected path (`/conversations/*`) → no session → redirect to `/login`
- Checks if auth path (`/login`, `/register`) → has session → redirect to `/conversations`
- Only matches `/conversations/:path*`, `/login`, `/register`

### 2.9 Conversations Layout (3-Panel UI)

**NavigationRail (60px left)**
- DM icon: MessagesSquare — click switches to DM mode
- Divider line
- Workspace icons: Each workspace shows either imageUrl or first 2 letters of name. Active workspace has a left bar indicator and primary color background.
- "+" button: Opens CreateWorkspaceModal

**Responsive behavior:**
- On desktop (>768px): All 3 panels visible
- On mobile: Only shows what's relevant. If on conversation list → shows NavRail + Sidebar. If on conversation detail → shows NavRail + Main content.

### 2.10 Sidebar

**DM Mode:**
- Search bar with magnifying glass icon
- "New" dropdown button with "New Message" and "Invite Someone" options
- DM conversation list with:
  - UserAvatar + PresenceIndicator
  - Username + latest message preview
  - Unread count badge (red pill)
  - Active state highlight
  - Hidden conversations: Deleted user with no messages are filtered out

**Workspace Mode:**
- WorkspaceHeader: Shows workspace name (sticky at top, hover effect)
- "Channels" section header with "+" to open CreateChannelModal
- Channel list: Shows "# channel-name" format

**Bottom Profile Bar:**
- UserAvatar + green/yellow/gray status dot
- Username + status label ("Online"/"Connecting..."/"Offline")
- Logout icon button

### 2.11 ActiveConversation

**Header:**
- Mobile: Back arrow (ArrowLeft) with unread count badge + conversation info
- DM: UserAvatar, PresenceIndicator, username
- Channel: Hash icon, channel name, workspace name (smaller text below)
- ThemeToggle (moon/sun icon)

**MessageList:**
- Infinite scroll with upward pagination (older messages)
- Message grouping: Same user within 1 minute → grouped together
- Each group: Shows UserAvatar, username, timestamp on first message
- Subsequent messages in group: Show timestamp on hover
- Message interactions (hover reveals):
  - Edit (pencil) → inline textarea
  - Delete (trash) → confirmation dialog
  - More menu → Copy Text, Edit Message, Delete Message
  - MessageStatus: Clock (pending), Check (sent), Double-check (read)
  - Read receipts: Blue double-check when partner has read
- Empty state: "No messages yet. Send a message to start the conversation!"
- Error state: Red error message with error details
- Loading state: Skeleton animation (5 message placeholders)
- "Jump to bottom" button: Appears when scrolled up, has blue dot if new messages

**MessageInput:**
- Auto-resizing textarea (scrollHeight)
- Emoji picker (Popover + emoji-picker-react)
- Send button: Primary color when text, dim when empty
- Desktop: Enter sends, Shift+Enter newline
- Mobile: Enter adds newline, tap send button

### 2.12 Modals

**CreateWorkspaceModal:**
- Backdrop blur overlay
- Title "Create Workspace"
- Description text
- Input for workspace name
- Cancel + Create buttons
- On success: Auto-switches to workspace mode

**CreateChannelModal:**
- Same style as workspace modal
- Converts name to lowercase-hyphenated
- On success: Auto-navigates to the new channel

**NewConversationModal (for DM):**
- Search input with debounced user search
- User list with Avatar + username + "Message" button
- Loading / empty / no-results states
- On select: Creates conversation and navigates

**InviteModal:**
- Link icon + "Share this link" instruction
- Loading state while generating
- Generated link in read-only input + Copy button
- Expiration date display
- Copy feedback (Check icon + "Copied" text)
- Error state

---

## 3. Critical UI/UX Issues & Recommendations

### 3.1 🔴 No Onboarding Flow for New Users

**Issue:** After registration, users land on an empty `/conversations` page with no guidance. The "No conversations yet" EmptyState shows "Start a Conversation" and "Invite Someone" buttons, but there's no workspace, no channels, and no tutorial.

**Impact:** New users have no idea what to do first. Competitors (Slack, Discord) start with workspace creation and guided onboarding.

**Recommendations:**
1. **Auto-create a personal workspace** on registration, with a "general" channel and a welcome message explaining core features.
2. **Onboarding tour** — a 3-step overlay/guide: "This is your sidebar", "This is where you message", "Invite your team".
3. **Progressive disclosure** — instead of an empty state, show a "Getting Started" checklist: [✓] Create your workspace, [ ] Invite a teammate, [ ] Send your first message.

### 3.2 🔴 No User Discovery / "People" Tab

**Issue:** The only way to find other users is the NewConversationModal, which requires knowing a name to search. There's no directory, no "People" list, and no way to see who else is in your workspace.

**Impact:** Users can't discover colleagues organically. You need to know exactly who to search for.

**Recommendations:**
1. **Add a workspace member list** accessible from the WorkspaceHeader (click workspace name → dropdown with members).
2. **Show workspace members** in the sidebar (similar to Slack's "people" section, or a collapsible list).
3. **Suggested users** in the NewConversationModal even without typing — show recently active users or all users in shared workspaces.

### 3.3 🔴 No Typing Indicators

**Issue:** The codebase defines `TYPING_START` and `TYPING_STOP` socket events, but there is no UI component implementing typing indicators.

**Impact:** Users can't see when someone is composing a message. This makes the app feel less "real-time" and responsive.

**Recommendation:**
Add a typing indicator below the MessageInput or in the header (e.g., "Jane is typing...") using the existing socket events. Debounce to avoid flickering.

### 3.4 🔴 No Push Notifications

**Issue:** There is no notification system. When the tab is not focused, the only feedback is a document title change ("(1) New Message! - Nexus"). No service worker, no push API, no system notifications.

**Impact:** Users won't know about new messages unless the browser tab is open and visible.

**Recommendations:**
1. **Implement Browser Notification API** — request permission on first visit, send system notifications for new messages when the tab is hidden.
2. **Add notification preferences** per conversation (mute/unmute).
3. **Consider a channel-level notification bell** to distinguish between mention notifications and general messages.

### 3.5 🔴 No "General" Auto-Join on Workspace Creation

**Issue:** When creating a workspace via the UI, the code creates a "general" channel in the backend, but there is no clear auto-routing or visual indicator that this happened. The channel may not appear immediately due to query invalidation timing.

**Impact:** Users may think workspace creation failed because they don't see any channels.

**Recommendation:**
After workspace creation, ensure the `useWorkspaceChannels` query is invalidated immediately and auto-navigate to the "general" channel with a smooth transition.

### 3.6 🔴 Mobile UX Issues

**Issue:** The responsive layout hides panels (sidebar on mobile when viewing a conversation), but:
- The back arrow in the header has a tiny hit area (32px padded, real target ~20px)
- No swipe gesture to go back
- The "New Message" modal is full-screen but uses backdrop-blur which can be disorienting on mobile
- No bottom navigation bar — users must use the small back arrow

**Recommendations:**
1. **Increase touch targets** to at least 44px (iOS HIG / Material Design guidelines).
2. **Add swipe-right gesture** on the conversation view to reveal the sidebar.
3. **Consider a mobile bottom nav** with DM / Workspace / Profile tabs.
4. **Use a sheet-style modal** instead of a centered modal on mobile (slides up from bottom).

---

## 4. Medium-Priority Improvements

### 4.1 🟡 Empty States Need More Love

**Current:** 
- DM mode empty: "Nothing here yet" (small, easy to miss)
- Channel mode empty: "Nothing here yet"
- Workspace with no channels: Not handled gracefully

**Recommendations:**
- For channels: Show "No channels yet — create the first one!" with an inline button.
- For DM: "Start a conversation by clicking the + button above" with a visual cue.
- Add illustrations or icons to empty states to make them feel intentional.

### 4.2 🟡 No Message Threads

**Issue:** All messages appear in a flat timeline. There's no threading (Slack threads, Discord reply chains). This makes it hard to follow side conversations.

**Recommendation:** Implement basic threading: "Reply in thread" action on messages, thread sidebar, thread indicator on parent messages.

### 4.3 🟡 No File/Image Sharing

**Issue:** The message input only supports text and emoji. No file uploads, image sharing, or link previews.

**Recommendation:** Add file upload support (drag & drop, file picker) with image preview, file type icons, and progress indicators.

### 4.4 🟡 No Message Search

**Issue:** The search bar in the sidebar only filters the conversation/channel list. There is no global message search (Cmd+K or Ctrl+K).

**Recommendation:** Implement a global search: Cmd+K shortcut, search across all conversations, results grouped by conversation, keyboard navigation.

### 4.5 🟡 Workspace Menu Lacks Functionality

**Current:** Clicking the workspace name in the header does nothing (just a hover effect). The only way to interact is the NavigationRail.

**Recommendations:**
1. Make the WorkspaceHeader clickable → dropdown with "Workspace Settings", "Invite Members", "Create Channel", "Switch Workspace".
2. Add workspace-level settings: rename, change image, manage members.

### 4.6 🟡 No Channel Description or Topic

**Issue:** Channels have no description, topic, or purpose. Users must guess what a channel is for.

**Recommendation:** Add a channel topic/description that shows in the header when the channel is active. Editable by admins.

### 4.7 🟡 Invite UX Fragmentation

**Issue:** Invites can be generated from the InviteModal, but:
- There's no way to see who has been invited or manage existing invites
- The "Invite Someone" button in DM mode also opens the InviteModal, but the flow for workspace invites vs conversation invites is confusing
- No invitation from the workspace context (right-click workspace → "Invite to Workspace")

**Recommendation:** Simplify the invite flow. Have a single entry point per workspace that lets you invite to specific channels. Add an "Invited members" tab to see pending invites.

### 4.8 🟡 Registration Password Requirements Are Strict

**Current:** Passwords require: 8+ chars, uppercase, number, special character. This is shown only via validation errors.

**Recommendation:** Show password requirements as a checklist below the password field that updates in real-time (like many modern auth forms). This reduces frustration during registration.

---

## 5. Low-Priority Polish & Nice-to-Haves

### 5.1 🔵 Visual Polish

- **Message reactions:** Add emoji reactions to messages (Slack-style)
- **Code block formatting:** Support markdown code blocks with syntax highlighting
- **Link previews:** Auto-generate rich previews for shared URLs
- **Read receipts UI:** Show "Seen by" tooltip on the double-check icon
- **Smooth animations:** Entry/exit animations for modals, sidebar transitions
- **Skeleton states are great** — but the message skeleton shows a fixed 5 items regardless of actual message count

### 5.2 🔵 Navigation & Shortcuts

- **Cmd+K / Ctrl+K** global command palette
- **Keyboard shortcuts:** Cmd+Enter to send, Arrow keys to navigate conversation list, Cmd+[1-9] to switch conversations
- **Scroll position memory:** Remember scroll position when switching conversations
- **Draft persistence per conversation** — already implemented in the store but not used in the UI (the `drafts` Map exists but `setDraft`/`clearDraft` are never called)

### 5.3 🔵 User Profile

- **Profile editing:** No way to change username, avatar, or password after registration
- **User status:** Only online/offline — no custom status messages (away, busy, custom text)
- **User cards:** Hover over a username → show mini-profile card

### 5.4 🔵 Accessibility

- **Focus management:** When modals open, focus should trap inside the modal. Currently relies on browser defaults.
- **Keyboard navigation:** The conversation list should be navigable with arrow keys
- **Screen reader announcements:** New messages should be announced via `aria-live` regions
- **Color contrast checks:** Some text (e.g., "Nothing here yet" in muted foreground) may fail WCAG AA

### 5.5 🔵 Theme Toggle Placement

**Issue:** The theme toggle is in the conversation header, which means it only appears when a conversation is active. On the EmptyState page, there's no way to toggle the theme.

**Recommendation:** Move the theme toggle to the NavigationRail or the user dropdown menu at the bottom of the sidebar.

### 5.6 🔵 404 Page/Error State Polish

**Current:** `/not-found.tsx` has a nice 404 page with a bouncing ghost icon, back button, and "Return Home" link. However:
- The "Documentation", "Privacy", "Terms" links in the landing page footer all point to "#"
- API error handling shows raw error text to users ("Error fetching messages:" + error message)
- Rate limit errors show a red toast but no guidance on retry timing

---

## 6. Summary of Recommended Changes

| Priority | Area | Recommendation |
|----------|------|---------------|
| 🔴 Critical | Onboarding | Auto-create personal workspace + guided tour |
| 🔴 Critical | User Discovery | People/workspace members list in sidebar |
| 🔴 Critical | Typing Indicators | Implement `typing:start/stop` socket events in UI |
| 🔴 Critical | Push Notifications | Browser Notification API + permission flow |
| 🔴 Critical | Mobile UX | Larger touch targets, swipe gestures, bottom nav |
| 🟡 Medium | Empty States | Better copy, illustrations, inline CTAs |
| 🟡 Medium | Message Threads | "Reply in thread" + thread panel |
| 🟡 Medium | File Sharing | Drag & drop upload, image preview |
| 🟡 Medium | Global Search | Cmd+K search across all conversations |
| 🟡 Medium | Workspace Menu | Dropdown with settings, invite, channel creation |
| 🟡 Medium | Channel Topic | Description/header for each channel |
| 🟡 Medium | Invite UX | Unified invite flow per workspace |
| 🟡 Medium | Password UX | Real-time requirements checklist |
| 🟡 Medium | **Member List** | **Add workspace member list in sidebar with presence + DM initiation** |
| 🔵 Polish | Reactions | Emoji reactions on messages |
| 🔵 Polish | Code Blocks | Markdown code block rendering |
| 🔵 Polish | Shortcuts | Cmd+K, keyboard navigation, shortcuts |
| 🔵 Polish | Profile Editing | Change username, avatar, password |
| 🔵 Polish | Accessibility | Focus trapping, aria-live, keyboard nav |
| 🔵 Polish | Draft Persistence | Wire up existing drafts store to MessageInput |
| 🔵 Polish | Theme Toggle | Move to global navigation area |

---

## 7. Implementation Plan: Workspace Member List / People Discovery

This section provides a detailed, file-by-file implementation plan for adding a "Members" section to the sidebar in workspace mode — showing all members of the active workspace with avatars, presence indicators, roles, and the ability to start a DM.

---

### 7.1 Current State Analysis

**What already exists:**

| Layer | Status | Details |
|-------|--------|---------|
| **Database** | ✅ Ready | `WorkspaceMember` table has `id`, `workspaceId`, `userId`, `role`, `joinedAt`. Prisma schema includes relations to `User` and `Workspace`. |
| **Server Repository** | ✅ Ready | `findWorkspaceById()` already includes `members` with `user` (id, username, avatarUrl). |
| **Server Service** | ✅ Ready | `getWorkspaceDetails()` returns workspace with members attached. |
| **Server Controller** | ✅ Ready | `getWorkspaceDetails` controller exists, returns `{ workspace, channels }`. |
| **Server Routes** | ❌ **Missing** | Only `GET /:id/channels` is registered. Routes for `GET /`, `GET /:id`, `POST /`, `POST /:id/channels` are **not registered** in `workspaces.routes.ts`. |
| **Client Workspace Type** | ⚠️ Partial | `Workspace` has `members?: WorkspaceMember[]` but `WorkspaceMember` **lacks the `user` property**. The server returns user info in members, but the client type doesn't capture it. |
| **Client Workspace API** | ⚠️ Partial | `fetchUserWorkspaces()` returns `Workspace[]` (no members). `fetchWorkspaceDetails()` returns workspace with members (but the type doesn't match). |
| **Client Hook** | ✅ Ready | `useWorkspaceDetails()` fetches and caches workspace details with members. |
| **Sidebar Component** | ⚠️ Only channels | `useWorkspaceDetails` is called, but only `workspaceDetails.workspace` is used (name in WorkspaceHeader). Members are never accessed. |
| **Presence Indicators** | ✅ Ready | `PresenceIndicator` component exists, uses `onlineUsers` from chat store. |
| **User Avatar Component** | ✅ Ready | `UserAvatar` component with name/initials/avatarUrl support. |

---

### 7.2 Step-by-Step Implementation

#### Step 1: Fix Server Routes (Critical Prerequisite)

**File:** `server/src/modules/workspaces/workspaces.routes.ts`

**What to change:** Register the missing controller methods as routes.

```typescript
import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import {
  getUserWorkspaces,
  getWorkspaceDetails,
  getWorkspaceChannels,
  createWorkspace,
  createChannel,
} from "./workspaces.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getUserWorkspaces);              // GET /api/workspaces
router.get("/:id", getWorkspaceDetails);          // GET /api/workspaces/:id
router.get("/:id/channels", getWorkspaceChannels);
router.post("/", createWorkspace);                // POST /api/workspaces
router.post("/:id/channels", createChannel);      // POST /api/workspaces/:id/channels

export default router;
```

> **Note:** Without this, the workspace list and detail endpoints return 404. This is a pre-existing bug — the controller methods exist but are not wired to routes.

---

#### Step 2: Fix Client Workspace Types

**File:** `client/src/modules/chat/types/workspace.ts`

**What to change:** Add `user` to `WorkspaceMember` so the type matches what the server returns.

```typescript
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {                          // ← ADD THIS BLOCK
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}
```

---

#### Step 3: Create a Reusable `WorkspaceMemberList` Component

**File:** `client/src/modules/chat/components/WorkspaceMemberList.tsx` _(new file)_

**Purpose:** A collapsible section in the sidebar showing all workspace members with avatars, presence, role badges, and DM initiation on click.

**Component structure:**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Crown } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { PresenceIndicator } from "./PresenceIndicator";
import { useChatStore } from "../store/chatStore";
import { useCreateConversationMutation } from "../hooks/useConversations";
import { useRouter } from "next/navigation";
import type { WorkspaceMember } from "../types/workspace";

interface WorkspaceMemberListProps {
  members: WorkspaceMember[];
  currentUserId: string | null;
}

export function WorkspaceMemberList({ members, currentUserId }: WorkspaceMemberListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { mutate: createConversation, isPending } = useCreateConversationMutation();
  const router = useRouter();

  // Sort: online first, then by role (OWNER > ADMIN > MEMBER), then alphabetically
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = onlineUsers.has(a.userId) ? 1 : 0;
    const bOnline = onlineUsers.has(b.userId) ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
    return a.user.username.localeCompare(b.user.username);
  });

  const handleMemberClick = (member: WorkspaceMember) => {
    if (member.userId === currentUserId) return;
    createConversation(member.userId, {
      onSuccess: (conversation) => {
        router.push(`/conversations/${conversation.id}`);
      },
    });
  };

  const onlineCount = members.filter(m => onlineUsers.has(m.userId)).length;

  return (
    <div className="px-2">
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2"
      >
        <span>Members — {onlineCount}/{members.length}</span>
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {!isCollapsed && (
        <div className="space-y-[2px]">
          {sortedMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleMemberClick(member)}
              disabled={isPending || member.userId === currentUserId}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-default text-left"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  name={member.user.username}
                  src={member.user.avatarUrl}
                  className="h-7 w-7"
                  fallbackClassName="text-[10px] bg-primary/20 text-primary font-medium"
                />
                <PresenceIndicator userId={member.userId} className="-bottom-0.5 -right-0.5 h-2.5 w-2.5" />
              </div>
              <span className="flex-1 truncate">
                {member.user.username}
                {member.userId === currentUserId && (
                  <span className="text-muted-foreground/60 ml-1">(you)</span>
                )}
              </span>
              {member.role === "OWNER" && (
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" title="Owner" />
              )}
              {member.role === "ADMIN" && (
                <Crown className="h-3.5 w-3.5 text-blue-500 shrink-0" title="Admin" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**UI states to handle:**
- **Loading:** While workspaceDetails is loading, show 5 skeleton rows (avatar + name placeholders)
- **Empty:** A workspace should always have at least 1 member (the owner), but handle 0 gracefully with "No members"
- **Error:** If workspace details fail to load, show a subtle error state
- **Collapsed/Expanded:** Remember collapsed state per workspace (local state, or store in chatStore for persistence)
- **Online/Offline:** Members sorted by presence, green/gray dots
- **Self:** Highlight "(you)" on the current user, disable click on self
- **DM on click:** Click any member → create a DM conversation → navigate to it

---

#### Step 4: Export the New Component

**File:** `client/src/modules/chat/index.ts`

**What to change:** Add the new component to the module's public exports.

```typescript
export { WorkspaceMemberList } from "./components/WorkspaceMemberList";
```

---

#### Step 5: Integrate into Sidebar

**File:** `client/src/modules/chat/components/Sidebar.tsx`

**What to change:** Import and render `WorkspaceMemberList` in the workspace mode section of the sidebar, after the channels list.

**Changes needed:**

1. **Import** the component:
   ```typescript
   import { WorkspaceMemberList } from "./WorkspaceMemberList";
   ```

2. **Extract members** from workspaceDetails:
   ```typescript
   const workspaceMembers = workspaceDetails?.workspace?.members || [];
   ```

3. **Render the member list** after the channels section, inside the scrollable area:
   ```tsx
   {mode === "WORKSPACE" && workspaceMembers.length > 0 && (
     <div>
       <WorkspaceMemberList
         members={workspaceMembers}
         currentUserId={currentAuthUser?.id || null}
       />
     </div>
   )}
   ```

4. **(Optional but recommended)** Collocate the search bar to filter members too. In workspace mode, the current code hides the search bar and shows WorkspaceHeader. Instead, show a workspace search bar that filters both channels AND members.

---

### 7.3 User Flow After Implementation

```
User clicks workspace icon in NavigationRail
  → Sidebar switches to workspace mode
  → WorkspaceHeader shows workspace name
  → Channels section shows workspace channels
  → Members section shows:
      "MEMBERS — 3/5" header (collapsible)
      ├── [Avatar] alice  👑      (online, owner)
      ├── [Avatar] bob    (you)   (online)
      ├── [Avatar] carol           (offline)
      └── [Avatar] dave            (offline)
  → Click any member → creates DM → navigates to conversation
```

---

### 7.4 Rendering States Checklist

| State | Behavior |
|-------|----------|
| **Loading** | 5 skeleton rows (pulsing avatar circles + name bars), section header visible |
| **Loaded, has members** | Sort: online first, then OWNER/ADMIN/MEMBER, then alpha. Show presence dots, role icons. |
| **Loaded, 0 members** | Show subtle "No members in this workspace" text (edge case — should be impossible) |
| **Error fetching** | Keep previous cached data if available; show inline error toast otherwise |
| **Collapsed** | Only show section header with count; ChevronRight icon |
| **Self member** | Show "(you)" label, disable click, style differently |
| **Click member** | Optimistically create conversation via `useCreateConversationMutation`, navigate on success |
| **DM already exists** | `useCreateConversationMutation` returns existing conversation, navigation still works |
| **Mobile** | Same rendering, but touch targets should be ≥44px for the member rows |

---

### 7.5 Files Changed Summary

| # | File | Action |
|---|------|--------|
| 1 | `server/src/modules/workspaces/workspaces.routes.ts` | **Edit** — register missing controller routes |
| 2 | `client/src/modules/chat/types/workspace.ts` | **Edit** — add `user` to `WorkspaceMember` type |
| 3 | `client/src/modules/chat/components/WorkspaceMemberList.tsx` | **Create** — new member list component |
| 4 | `client/src/modules/chat/index.ts` | **Edit** — export new component |
| 5 | `client/src/modules/chat/components/Sidebar.tsx` | **Edit** — import and render `WorkspaceMemberList` |

---

### 7.6 Future Enhancements (Post-MVP)

- **Member filter/search** — integrate with the search bar to filter both channels and members
- **Right-click context menu** on members → "Start DM", "View Profile", "Mute"
- **User status messages** — allow setting custom status (away, busy, "In a meeting")
- **Role management UI** — promote/demote members from the list (if you're OWNER/ADMIN)
- **Pending invites indicator** — show "3 pending invites" in the member section header
- **Online count tooltip** — hover "MEMBERS" count to see breakdown (3 online, 2 offline)
- **Persist collapsed state** per workspace using the chatStore

---

## Appendix: What's Working Well

To be balanced, the app already has several strong UX patterns worth preserving:

- ✅ **Optimistic UI for messages** — messages appear instantly, then confirm/replace on server response
- ✅ **Message grouping** — same-user messages within 1 minute are grouped, reducing visual clutter
- ✅ **Auto-scroll + "Jump to bottom"** — smooth scrolling behavior with new message detection
- ✅ **Unread count badges** — persistent across conversations, shown on mobile back button too
- ✅ **Presence indicators** — green/gray dots on avatars for online status
- ✅ **Read receipts** — single check (sent) / double check (read) pattern
- ✅ **Smooth loading states** — skeleton animations rather than spinners for content areas
- ✅ **Rate limiting UX** — specific toast style for rate limit errors
- ✅ **Invite continuation** — sessionStorage-based invite flow survives login redirect
- ✅ **Responsive layout** — 3-column collapses to single-column on mobile
- ✅ **Dark/light theme** — persistent with next-themes, toggle in conversation header
- ✅ **Error handling** — error states for messages, rate limiting, network issues
- ✅ **Edit/delete messages** — inline editing with Escape/Save keyboard support
- ✅ **Sticky elements** — header stays fixed, search, user profile bar
- ✅ **Back navigation with unread count** — mobile back button shows total unread
- ✅ **Separate DM/Workspace modes** — clean mode switching via NavigationRail
