# Nexus UI/UX Audit Report — Full User Flow Analysis

**Date:** June 15, 2026 (Updated)
**Scope:** Complete user-facing flow from Landing Page through authentication, chat interface, invites, workspaces, notifications, and settings.

---

## Table of Contents

1. [Complete User Flow Map](#1-complete-user-flow-map)
2. [Step-by-Step Flow Breakdown](#2-step-by-step-flow-breakdown)
3. [Critical UI/UX Issues & Recommendations](#3-critical-uiux-issues--recommendations)
4. [Medium-Priority Improvements](#4-medium-priority-improvements)
5. [Low-Priority Polish & Nice-to-Haves](#5-low-priority-polish--nice-to-haves)
6. [Summary of Recommended Changes](#6-summary-of-recommended-changes)

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
  │   ├── "➕" button to create workspace → CreateWorkspaceModal
  │   └── Theme toggle at bottom
  ├── Sidebar (middle: 240px)
  │   ├── DM mode: search bar + DM conversations list
  │   ├── Workspace mode: WorkspaceHeader + channels list (public/private sections)
  │   └── Bottom: User profile + logout button
  └── Main Content (right: fluid)
      ├── Index page (/conversations) → EmptyState component
      ├── Conversation detail (/conversations/:id) → ActiveConversation
      └── InfoPanel (right: 320px, togglable): About / Members / Pins tabs

Settings Modal (accessible from anywhere)
  ├── Profile tab (username, displayName, avatarUrl)
  ├── Appearance tab (theme: dark/light/system)
  └── Notifications tab (push toggle, DM/mention/channel toggles)

Notifications Bell (in top bar)
  ├── Badge with unread count
  ├── Popover with recent 10 notifications
  ├── "View all" → /notifications full page
  └── "Mark all as read" action

ActiveConversation
  ├── Header
  │   ├── Back button (mobile) with unread badge
  │   ├── DM: UserAvatar + PresenceIndicator + name
  │   ├── Channel: Hash icon + channel name + workspace name
  │   ├── ThemeToggle
  │   └── InfoPanel toggle button
  ├── MessageList
  │   ├── Infinite scroll (upward)
  │   ├── Markdown rendering (bold, italic, code, blockquotes, lists, links)
  │   ├── Grouped messages (by user, within 1 min)
  │   ├── Inline edit / delete with confirmation
  │   ├── "Jump to bottom" button with new-message indicator
  │   └── Read receipts (single/double-check indicators)
  └── MessageInput
      ├── Auto-resizing textarea (max 140px)
      ├── Emoji picker popover
      ├── Send button (disabled when empty)
      ├── Enter to send (desktop) / Enter=newline (mobile)
      └── Optimistic UI (pending → confirmed)
```

---

## 2. Key Feature States (UPDATED)

### ✅ Implemented Since Initial Audit

| Feature | Status | Notes |
|---------|--------|-------|
| **In-app notification system** | ✅ Complete | BellPopover, notifications page, socket delivery, React Query hooks |
| **Push notifications** | ✅ Complete | VAPID-based web push via Service Worker |
| **Notification settings** | ✅ Complete | Push toggle, DM/mention/channel toggles, stored on User model |
| **Profile editing** | ✅ Complete | Username, displayName, avatarUrl via PATCH /users/me |
| **Appearance settings** | ✅ Complete | Theme toggle (light/dark/system) via next-themes |
| **Settings modal** | ✅ Complete | SharedSettingsModal with tabs |
| **InfoPanel** | ✅ Complete | About/Members/Pins tabs |
| **Markdown rendering** | ✅ Complete | react-markdown + remark-gfm |
| **Member list panel** | ✅ Complete | Right-side Discord-style panel with presence + role badges |
| **Batch invite** | ✅ Complete | Multi-user invite by email/username |
| **Workspace member removal** | ✅ Complete | With MEMBER_REMOVED notification |
| **Channel public/private separation** | ✅ Complete | Sidebar split into public/private sections |
| **Channel context menu** | ✅ Complete | Rename, delete channel |
| **Theme toggle placement** | ✅ Complete | Moved to NavigationRail (global access) |

### 🔴 Still Open Issues

| Issue | Priority | Notes |
|-------|----------|-------|
| Onboarding flow for new users | Medium | `isOnboarded` field exists, no UI |
| No typing indicators | Medium | Socket events defined, no handler |
| No message threads | Medium | No thread model |
| No file/image sharing | Medium | No file storage integration |
| No global message search | Low | No search infrastructure |
| No reactions (emoji) | Medium | Planned feature |
| No @mentions | Medium | Planned feature |
| Channel read receipts | Medium | Not fully working for channels |
| Message saving for offline | Low | No offline support |
| No user discovery page | Low | Suggested users on registration only |

---

## 3. Critical UI/UX Issues & Recommendations

### 3.1 🟡 No Onboarding Flow for New Users

**Issue:** After registration, users land on an empty `/conversations` page with no guidance.

**Impact:** New users have no idea what to do first.

**Recommendations:**
1. Auto-create a personal workspace on registration
2. Onboarding tour overlay

### 3.2 🟡 No Typing Indicators

**Issue:** `TYPING_START` and `TYPING_STOP` socket events defined but never used.

**Impact:** Users can't see when someone is composing.

**Recommendation:** Add typing indicator below MessageInput or in header.

### 3.3 🟡 No Message Threads

**Issue:** All messages appear in a flat timeline.

**Recommendation:** Implement "Reply in thread" action.

### 3.4 🟡 Mobile UX Issues

**Issue:** Touch targets small, no swipe gestures, no bottom nav.

**Recommendations:**
1. Increase touch targets to ≥44px
2. Add swipe-right gesture for sidebar
3. Consider mobile bottom nav

---

## 4. Medium-Priority Improvements

### 4.1 🟡 No File/Image Sharing
**Recommendation:** Drag & drop upload with image preview.

### 4.2 🟡 No Message Search
**Recommendation:** Cmd+K global search.

### 4.3 🟡 No Channel Description/Topic
**Recommendation:** Add channel topic editable by admins.

### 4.4 🟡 Registration Password Requirements
**Recommendation:** Show real-time requirements checklist.

---

## 5. Low-Priority Polish & Nice-to-Haves

### 5.1 🔵 Visual Polish
- Message reactions (emoji) 
- Code syntax highlighting
- Link previews
- Smooth animations

### 5.2 🔵 Navigation & Shortcuts
- Cmd+K command palette
- Keyboard shortcuts (Cmd+Enter, arrows)
- Scroll position memory

### 5.3 🔵 Accessibility
- Focus trapping in modals
- Keyboard nav for conversation list
- `aria-live` announcements

---

## 6. Summary of Recommended Changes

| Priority | Area | Recommendation | Status |
|----------|------|---------------|--------|
| 🔴 Critical | Onboarding | Auto-create personal workspace + guided tour | ❌ Not started |
| 🔴 Critical | Typing Indicators | Implement `typing:start/stop` socket events in UI | ❌ Not started |
| 🔴 Critical | Push Notifications | Browser Notification API + permission flow | ✅ **DONE** |
| 🔴 Critical | Mobile UX | Larger touch targets, swipe gestures, bottom nav | 🟡 Partial |
| 🟡 Medium | Empty States | Better copy, illustrations, inline CTAs | 🟡 Partial |
| 🟡 Medium | Message Threads | "Reply in thread" + thread panel | ❌ Not started |
| 🟡 Medium | File Sharing | Drag & drop upload, image preview | ❌ Not started |
| 🟡 Medium | Global Search | Cmd+K search across all conversations | ❌ Not started |
| 🟡 Medium | Workspace Menu | Dropdown with settings, invite, channel creation | ✅ **DONE** |
| 🟡 Medium | Channel Topic | Description/header for each channel | ❌ Not started |
| 🟡 Medium | **Member List** | Workspace member list in sidebar | ✅ **DONE** |
| 🟡 Medium | **Notification System** | In-app bell + push notifications | ✅ **DONE** |
| 🟡 Medium | **Settings** | Profile, appearance, notification settings | ✅ **DONE** |
| 🔵 Polish | Reactions | Emoji reactions on messages | ❌ Not started |
| 🔵 Polish | @Mentions | @user mentions with notifications | ❌ Not started |
| 🔵 Polish | Code Blocks | Syntax highlighting | ❌ Not started |
| 🔵 Polish | Profile Editing | Change username, avatar | ✅ **DONE** |
| 🔵 Polish | Theme Toggle | Move to global navigation area | ✅ **DONE** |
| 🔵 Polish | Markdown Rendering | Bold, italic, code, lists in messages | ✅ **DONE** |
| 🔵 Polish | InfoPanel | Right-side detail panel with tabs | ✅ **DONE** |
