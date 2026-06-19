# Nexus — Feature Inventory

> **Last Updated:** 2026-06-19  
> **Purpose:** Complete catalog of all features, their status, and dependencies.

---

## Core Messaging

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Direct Messages | ✅ Complete | conversations | auth, users |
| Message Sending | ✅ Complete | messages | conversations |
| Message Editing | ✅ Complete | messages | conversations, socket |
| Message Deletion (soft) | ✅ Complete | messages | conversations, socket |
| Read Receipts (DM) | ✅ Complete | messages, socket | conversations |
| Read Receipts (Channels) | 🟡 Partial | messages | conversations, socket |
| Message History (cursor pagination) | ✅ Complete | messages | conversations |
| Inline Replies | ✅ Complete | messages | conversations, socket |
| Pinned Messages | ✅ Complete | messages | conversations, socket |
| Markdown Rendering | ✅ Complete | messages | react-markdown |

## Real-Time

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Socket.io Connection | ✅ Complete | socket | auth |
| Presence (Online/Offline) | ✅ Complete | socket | redis |
| Multi-tab Support | ✅ Complete | socket | presenceStore |
| Typing Indicators | 🟡 Partial | messages | socket — emits work, client debounce not implemented |
| Socket Room Optimization | ✅ Complete | socket | — `socketsJoin()` replacing per-socket iteration |

## Workspaces & Channels

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Workspace CRUD | ✅ Complete | workspaces | auth |
| Workspace Roles (OWNER/ADMIN/MEMBER) | ✅ Complete | workspaces | workspaces |
| Channel CRUD | ✅ Complete | workspaces | workspaces |
| Public/Private Channels | ✅ Complete | workspaces | workspaces |
| Channel Auto-Join (public) | ✅ Complete | workspaces | workspaces |
| Channel Member Management | ✅ Complete | workspaces | workspaces |
| Workspace Member List | ✅ Complete | workspaces | workspaces, presence |
| Workspace Routing | ✅ Complete | workspaces | workspaces |

## Invites

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Invite Link Generation | ✅ Complete | invites | — |
| Invite Resolution | ✅ Complete | invites | workspaces, conversations |
| Batch Invite | ✅ Complete | invites | workspaces |
| Invite via Email (SendGrid) | ✅ Complete | invites | workspaces, email |
| 24h Link Rotation | ✅ Complete | invites | — |
| Multi-type (USER/CONVERSATION/WORKSPACE/CHANNEL) | ✅ Complete | invites | — |
| Socket Room Join on Accept | ✅ Complete | invites | socket — dynamically joins workspace/channel rooms |

## Notifications

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| In-App Notifications | ✅ Complete | notifications | socket |
| Bell Popover | ✅ Complete | notifications | notifications |
| Notification Page (infinite scroll) | ✅ Complete | notifications | notifications |
| Push Notifications (VAPID) | ✅ Complete | notifications | push.service |
| Service Worker | ✅ Complete | public/sw.js | push |
| Notification Preferences | ✅ Complete | notifications | users |
| Notification Types | ✅ Complete | notifications | — extends to CHANNEL_MEMBER_ADDED, CHANNEL_MEMBER_REMOVED, ROLE_CHANGED |
| Server-Side Message Notifications | ✅ Complete | messages | notifications — `sendMessageNotifications` wired to both socket + HTTP paths |

## Users & Profiles

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Profile Editing | ✅ Complete | users | auth |
| Avatar Upload | ✅ Complete | users | — |
| User Search | ✅ Complete | users | — |
| Status (AVAILABLE/AWAY/DND/INVISIBLE) | ✅ Complete | users | presence |
| Forgot/Reset Password | ✅ Complete | auth | Supabase Auth |
| Password Visibility Toggles | ✅ Complete | auth | — show/hide password in login + register forms |

## UI & Experience

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Responsive Layout (Mobile + Desktop) | ✅ Complete | chat (shell) | — |
| Dark/Light/System Theme | ✅ Complete | settings | next-themes |
| Settings Modal | ✅ Complete | settings | — |
| Onboarding Flow | ✅ Complete | onboarding | auth, workspaces |
| Landing Page | ✅ Complete | landing | — |
| Emoji Picker | ✅ Complete | messages | emoji-picker-react |
| Message Search | ✅ Complete | messages | — |
| AlertDialog Confirmations | ✅ Complete | shared/ui | shadcn AlertDialog — replaces window.confirm |

## Auth

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Email/Password Login | ✅ Complete | auth | Supabase Auth |
| GitHub OAuth | ✅ Complete | auth | Supabase Auth |
| Username OR Email Login | ✅ Complete | auth | Supabase Auth |
| Password Reset | ✅ Complete | auth | Supabase Auth |
| Session Persistence | ✅ Complete | auth | Supabase SSR |
| Edge Middleware Route Protection | ✅ Complete | auth | Next.js Middleware |
| JWKS Token Verification | ✅ Complete | auth | jose (zero network calls) |
| DB Trigger User Sync | ✅ Complete | auth | Supabase database trigger |

## Channel Management

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Manage Channel Members Modal | ✅ Complete | workspaces | — dedicated modal for add/remove members |
| Channel Member Add (Socket Join) | ✅ Complete | workspaces | socket — dynaminc room join on add |
| AlertDialog Confirmations | ✅ Complete | shared/ui | — replaces window.confirm in member removal |

## Planned (Not Started)

| Feature | Priority | Notes |
|---------|----------|-------|
| Emoji Reactions | Medium | Schema exists, no endpoints or UI |
| @Mentions | Medium | No detection or UI |
| File Uploads | Low | No infrastructure |
| Global Search / Cmd+K | Low | No implementation |
| Message Threads | Low | No implementation |
| URL Unfurling | Low | No implementation |
| Keyboard Shortcuts | Low | Cmd+K for search, Cmd+, for settings |
| i18n Support | Low | Hardcoded English text throughout |
