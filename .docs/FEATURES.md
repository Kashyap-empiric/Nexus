# Nexus — Feature Inventory

> **Last Updated:** 2026-06-16  
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
| Markdown Rendering | ✅ Complete | messages | react-markdown |

## Real-Time

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Socket.io Connection | ✅ Complete | socket | auth |
| Presence (Online/Offline) | ✅ Complete | socket | redis |
| Multi-tab Support | ✅ Complete | socket | presenceStore |
| Typing Indicators | ❌ Not Started | — | — |

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
| 24h Link Rotation | ✅ Complete | invites | — |
| Multi-type (USER/CONVERSATION/WORKSPACE/CHANNEL) | ✅ Complete | invites | — |

## Notifications

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| In-App Notifications | ✅ Complete | notifications | socket |
| Bell Popover | ✅ Complete | notifications | notifications |
| Notification Page (infinite scroll) | ✅ Complete | notifications | notifications |
| Push Notifications (VAPID) | ✅ Complete | notifications | push.service |
| Service Worker | ✅ Complete | public/sw.js | push |
| Notification Preferences | ✅ Complete | notifications | users |

## Users & Profiles

| Feature | Status | Module | Dependencies |
|---------|--------|--------|-------------|
| Profile Editing | ✅ Complete | users | auth |
| Avatar Upload | ✅ Complete | users | — |
| User Search | ✅ Complete | users | — |
| Status (AVAILABLE/AWAY/DND/INVISIBLE) | ✅ Complete | users | presence |

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

## Planned (Not Started)

| Feature | Priority | Notes |
|---------|----------|-------|
| Emoji Reactions | Medium | Schema exists, no endpoints or UI |
| @Mentions | Medium | No detection or UI |
| Pinned Messages | Low | No schema or UI |
| File Uploads | Low | No infrastructure |
| Global Search / Cmd+K | Low | No implementation |
| Message Threads | Low | No implementation |
| URL Unfurling | Low | No implementation |
