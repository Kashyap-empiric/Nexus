# Nexus — Project Context

> **Last Updated:** 2026-06-16  
> **Purpose:** Single source of truth for the current system state. Agents must read this before any feature work.

---

## 1. Project Overview

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo. It is a Slack-clone with workspaces, channels, DMs, in-app notifications, and web push notifications.

**Repository:** `nexus/`  
**Active Branch:** `feat/ui`  
**Deployment:** Render (server), Vercel (client — planned)

---

## 2. Implementation Status

### ✅ Fully Implemented

| Feature | Notes |
|---------|-------|
| Auth (Supabase + JWKS) | Email/password + GitHub OAuth. Edge middleware route protection. |
| Direct Messages | Full CRUD with dmPair deduplication. |
| Real-time Messaging | Socket.io: message send, edit, delete, read receipts. |
| Message Editing & Deletion | REST endpoints with socket broadcasts. Soft-delete. |
| Presence (Online/Offline) | Redis + in-memory dual-write. Multi-tab support. |
| Read Receipts | Single checkmark (sent) / double checkmark (read). Channels limited. |
| Invite System | Secure deep-linked invites (USER, CONVERSATION, WORKSPACE, CHANNEL). Batch invite support. |
| Workspaces | Full CRUD with roles (OWNER/ADMIN/MEMBER). Slug-based routing. |
| Channels | Public/Private channels within workspaces. Auto-join for public. |
| In-App Notifications | Bell popover, unread badges, infinite scroll page, socket delivery. |
| Web Push Notifications | VAPID-based. Subscription management via API. |
| User Profiles | Username, display name, avatar, bio, status. |
| Settings | Profile, Appearance (theme), Notifications preferences. |
| Markdown Rendering | Bold, italic, code, lists, blockquotes, links via react-markdown. |
| Responsive UI | Mobile-first with md: breakpoints. Safe area support. |
| Onboarding | Multi-step wizard (profile → workspace). |
| Channel Member Management | Add/remove members from channels via Manage Members modal. |

### 🟡 Partially Implemented / Known Issues

| Feature | Issue |
|---------|-------|
| Channel Read Receipts | `partnerLastReadMessageId` undefined for channels — double checkmark never shows. |
| Message Edit Transaction | `getMessageById` called outside `$transaction`. |
| Conversation UpdatedAt | Editing a message doesn't bump sidebar position. |
| Push Subscription Lifecycle | No proactive re-subscription on `pushsubscriptionchange` events. |
| Server Scaling | Presence system's in-memory Map prevents horizontal scaling. |

### ❌ Not Yet Started

| Feature | Priority |
|---------|----------|
| Reactions (emoji) | Medium |
| Mentions (@user) | Medium |
| Pinned Messages | Low |
| File Uploads | Low |
| Global Search / Cmd+K | Low |
| Message Threads / Replies UI | Low |

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js | ^16.2.7 |
| State Management | TanStack Query | ^5 |
| Client State | Zustand (chatStore) | — |
| Backend Framework | Express.js | ^4 |
| Real-time | Socket.io | ^4 |
| Database | PostgreSQL (Supabase) | — |
| ORM | Prisma | 7.x |
| Presence Cache | Upstash Redis | — |
| Auth | Supabase Auth + local JWKS | — |
| Package Manager | pnpm (root) / npm (apps) | — |
| Styling | Tailwind CSS v4 + shadcn/ui | — |

---

## 4. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `development` | Integration branch |
| `feat/ui` | Current active branch |
| `staging` | Pre-release testing |
