# Nexus Feature Implementation Plan

## Project Overview

Nexus is a real-time chat application (Slack/Discord-like) built with:
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Socket.IO client, TanStack Query
- **Backend:** Express.js, Prisma (PostgreSQL), Socket.IO, Redis (presence tracking)
- **Auth:** Supabase

The app supports **Direct Messages (DMs)** and **Workspace Channels**. Workspaces contain members, and within each workspace there are channels. Notifications (in-app + push) are fully implemented.

---

## ✅ Completed Features

### Core Messaging
- [x] Real-time message delivery (Socket.io)
- [x] Message editing + soft deletion
- [x] Cursor-based pagination (UUIDv7)
- [x] Optimistic UI with tempId + rollback
- [x] Read receipts (DMs working, channels partial)
- [x] Emoji picker in MessageInput
- [x] Markdown rendering (react-markdown + remark-gfm)

### Workspaces & Channels
- [x] Full workspace CRUD with slug-based routing
- [x] Public/private channels with ChannelVisibility enum
- [x] #general channel auto-creation, protected from deletion
- [x] Role-based access (OWNER, ADMIN, MEMBER)
- [x] Channel rename, delete, context menu
- [x] Sidebar with public/private channel separation
- [x] Member list panel (Discord-style right panel)
- [x] Member role management (promote/demote/remove)
- [x] Batch invite by email or username
- [x] Workspace-level unread counts

### Notifications & Push
- [x] In-app notification system (bell popover + full page)
- [x] Socket delivery via `notification:new` event
- [x] Web Push notifications (VAPID + web-push library)
- [x] Push subscription management API
- [x] Notification types: INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, MEMBER_REMOVED
- [x] React Query hooks with optimistic unread count updates

### Settings & Profiles
- [x] Profile editing (username, displayName, avatarUrl)
- [x] Appearance settings (theme toggle)
- [x] Notification preferences (push, DM, mention, channel toggles)
- [x] SharedSettingsModal with tabs

### Invites
- [x] Token-based invite system
- [x] 24h active link rotation
- [x] Atomic consumption via raw SQL
- [x] Workspace, conversation, channel, user resolvers
- [x] Batch invite (multiple users at once)
- [x] Invite continuation after login redirect

### Infrastructure
- [x] Centralized environment variables (config/env.ts)
- [x] Prisma + PostgreSQL with backward-compatible migrations
- [x] Socket.io with typed dispatcher
- [x] Presence tracking (Redis + in-memory dual-write)
- [x] Rate limiting (general, message, push)
- [x] Frontend module architecture (workspaces, notifications, settings, etc.)

---

## 🟡 Open Issues

### Issue 1: Message Read Icon Not Working in Channels
**Problem:** `partnerLastReadMessageId` is only passed for DMs, not channels.
**Files:** `ActiveConversation.tsx`, `MessageStatus.tsx`
**Fix Scope:** For channels, show "Read by N" indicator when at least one other member has read the message.

### Issue 2: No Typing Indicators
**Problem:** `TYPING_START` and `TYPING_STOP` socket events defined but never used.
**Fix Scope:** Add typing indicator component + connect to socket events.

### Issue 3: No Reactions (Emoji)
**Planned feature** — see `.docs/new/reactions.md`

### Issue 4: No @Mentions
**Planned feature** — see `.docs/new/mentions.md`

### Issue 5: No Message Search
**Problem:** Search bar only filters conversation list. No global message search.
**Fix Scope:** Cmd+K command palette, search across all conversations.

### Issue 6: CreateChannelModal Navigation Bug
**Problem:** Redirects to `/conversations/${channel.id}` instead of workspace URL.
**Fix Scope:** Update redirect URL in `CreateChannelModal`.

### Issue 7: Optimistic Channel Creation
**Problem:** Channel list polls every 5s instead of using socket events.
**Fix Scope:** Use `channel:update` (CREATED) socket event for real-time channel list updates.

### Issue 8: Non-transactional reads in editMessage
**Problem:** `getMessageById` called outside `$transaction`.
**Fix Scope:** Move read inside transaction.

---

## ❌ Planned Features (Not Started)

| Feature | Priority | Effort | Doc |
|---------|----------|--------|-----|
| Reactions (emoji) | Medium | 4-6h | `.docs/new/reactions.md` |
| @Mentions | Medium | 4-6h | `.docs/new/mentions.md` |
| Pin Messages | Low | 3-5h | `.docs/new/pins.md` |
| URL Unfurling | Low | 3-5h | `.docs/new/url-unfurling.md` |
| File Uploads | Low | 8-12h | Planned |
| Message Threads | Medium | 8-12h | Planned |
| Global Search | Low | 4-6h | Planned |
| Onboarding Flow | Medium | 4-6h | Planned |
| Typing Indicators | Low | 2-3h | Planned |

---

## Implementation Order (Recommended)

1. **Reactions** (4-6h) — Most visible feature, self-contained, reuses existing emoji picker
2. **@Mentions** (4-6h) — Leverages notification system, high collaboration value
3. **Pin Messages** (3-5h) — Quick win, InfoPanel Pins tab already built
4. **URL Unfurling** (3-5h) — Link previews, independent of other features
5. **File Uploads** (8-12h) — Most complex, requires storage setup
6. **Message Threads** (8-12h) — Major UX change
7. **Global Search** (4-6h) — Search infrastructure
8. **Onboarding Flow** (4-6h) — Guided first-time experience
