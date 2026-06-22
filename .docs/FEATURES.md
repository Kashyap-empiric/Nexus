# Nexus — Feature Capability Map

> **Last Updated:** 2026-06-22
> **Purpose:** Strategic inventory of features by domain capability, implementation status, and dependencies.

---

## 1. Core Messaging

```mermaid
flowchart LR
    subgraph Messaging["Messaging Domain"]
        SEND[Send Messages] --> EDIT[Edit Messages]
        SEND --> DELETE[Soft-Delete]
        SEND --> REPLY[Inline Replies]
        SEND --> MARKDOWN[Markdown Rendering]
        SEND --> SEARCH[Full-Text Search]
        
        HISTORY[Message History] --> PAGINATION[Cursor Pagination]
        HISTORY --> READ[Read Receipts]
        
        PIN[Pinned Messages] --> PIN_UI[Dedicated Panel]
        PIN --> PIN_SOCKET[Real-time Sync]
    end
    
    style SEND fill:#85C1E9,color:#000
    style EDIT fill:#85C1E9,color:#000
    style DELETE fill:#85C1E9,color:#000
    style REPLY fill:#85C1E9,color:#000
    style MARKDOWN fill:#85C1E9,color:#000
    style SEARCH fill:#85C1E9,color:#000
    style HISTORY fill:#85C1E9,color:#000
    style PAGINATION fill:#85C1E9,color:#000
    style PIN fill:#85C1E9,color:#000
    style PIN_UI fill:#85C1E9,color:#000
    style PIN_SOCKET fill:#85C1E9,color:#000
    style READ fill:#F9E79F,color:#000
```

| Feature | Status | Notes |
|---------|--------|-------|
| Send Messages | ✅ Complete | Optimistic UI via Socket.io |
| Edit Messages | ✅ Complete | REST + socket broadcast |
| Delete Messages (Soft) | ✅ Complete | `deletedAt` field, filtered from queries |
| Inline Replies | ✅ Complete | `replyToId` foreign key |
| Markdown Rendering | ✅ Complete | react-markdown + remark-gfm |
| Message History | ✅ Complete | Cursor-based pagination with UUIDv7 |
| Pinned Messages | ✅ Complete | Dedicated panel, real-time sync |
| Read Receipts (DMs) | ✅ Complete | Single/double checkmark |
| Read Receipts (Channels) | 🟡 Partial | `partnerLastReadMessageId` undefined for channels |
| Message Search | ✅ Complete | `contains` query — no full-text index |

---

## 2. Workspaces & Channels

```mermaid
flowchart LR
    subgraph Workspaces["Workspace Domain"]
        WS_CRUD[Workspace CRUD] --> ROLES[Role Management<br/>OWNER / ADMIN / MEMBER]
        WS_CRUD --> SLUG[Slug-based Routing]
        WS_CRUD --> MEMBERS[Member Management]
        
        CH_CRUD[Channel CRUD] --> PUBLIC[Public Channels<br/>Auto-join]
        CH_CRUD --> PRIVATE[Private Channels<br/>Invite-only]
        CH_CRUD --> CH_MEMBERS[Member Management]
        CH_CRUD --> VISIBILITY[Visibility Toggle]
    end
    
    style WS_CRUD fill:#85C1E9,color:#000
    style ROLES fill:#85C1E9,color:#000
    style SLUG fill:#85C1E9,color:#000
    style MEMBERS fill:#85C1E9,color:#000
    style CH_CRUD fill:#85C1E9,color:#000
    style PUBLIC fill:#85C1E9,color:#000
    style PRIVATE fill:#85C1E9,color:#000
    style CH_MEMBERS fill:#85C1E9,color:#000
    style VISIBILITY fill:#85C1E9,color:#000
```

| Feature | Status | Notes |
|---------|--------|-------|
| Workspace CRUD | ✅ Complete | Create, read, update, delete |
| Workspace Roles | ✅ Complete | Hierarchical: OWNER > ADMIN > MEMBER |
| Slug-based Routing | ✅ Complete | `/workspaces/{slug}/channels/{id}` |
| Member Management | ✅ Complete | Add, remove, change roles |
| Channel CRUD | ✅ Complete | Create, rename, delete |
| Public Channels | ✅ Complete | Auto-join all workspace members |
| Private Channels | ✅ Complete | Explicit member addition |
| Channel Member Management | ✅ Complete | Dedicated `ManageChannelMembersModal` |
| Visibility Toggle | ✅ Complete | PUBLIC ↔ PRIVATE (with confirmation) |
| Channel List Polling | 🟡 Partial | Uses 5s interval instead of socket events |

---

## 3. Real-Time Infrastructure

```mermaid
flowchart LR
    subgraph Realtime["Real-Time Domain"]
        SOCK[Socket.io Connection] --> PRES[Presence Tracking]
        SOCK --> ROOMS[Room Architecture]
        SOCK --> RECONNECT[Auto-Reconnect]
        
        PRES --> MULTI[Multi-Tab Support]
        PRES --> STATUS[Status: DND / AWAY]
        
        TYPING[Typing Indicators] --> TYPING_SRV[Server Handler]
        TYPING --> TYPING_CLI[Client Debounce]
    end
    
    style SOCK fill:#85C1E9,color:#000
    style PRES fill:#85C1E9,color:#000
    style ROOMS fill:#85C1E9,color:#000
    style RECONNECT fill:#85C1E9,color:#000
    style MULTI fill:#85C1E9,color:#000
    style STATUS fill:#85C1E9,color:#000
    style TYPING_SRV fill:#85C1E9,color:#000
    style TYPING_CLI fill:#F9E79F,color:#000
```

| Feature | Status | Notes |
|---------|--------|-------|
| Socket.io Connection | ✅ Complete | Auth middleware, room joining |
| Presence Tracking | ✅ Complete | Redis + in-memory dual-write |
| Multi-Tab Support | ✅ Complete | Set-based socket tracking |
| Room Architecture | ✅ Complete | `user:` / `workspace:` / `conversation:` rooms |
| Auto-Reconnect | ✅ Complete | Exponential backoff |
| Status (DND / AWAY) | ✅ Complete | Server-side + broadcast |
| Typing Server Handler | ✅ Complete | Broadcasts to conversation room |
| Typing Client Debounce | 🟡 Partial | Missing — fires on every keystroke |
| Socket Room Optimization | ✅ Complete | `io.in().socketsJoin()` replacing per-socket iteration |

---

## 4. Notifications

```mermaid
flowchart LR
    subgraph Notifications["Notification Domain"]
        IN_APP[In-App Notifications] --> BELL[Bell Popover]
        IN_APP --> PAGE[Full Notification Page]
        IN_APP --> UNREAD[Unread Badge]
        
        PUSH[Web Push Notifications] --> VAPID[VAPID Protocol]
        PUSH --> SW[Service Worker]
        PUSH --> SUBS[Subscription Management]
        
        PREF[Notification Preferences] --> TOGGLE[Per-Type Toggles]
    end
    
    style IN_APP fill:#85C1E9,color:#000
    style BELL fill:#85C1E9,color:#000
    style PAGE fill:#85C1E9,color:#000
    style UNREAD fill:#85C1E9,color:#000
    style PUSH fill:#85C1E9,color:#000
    style VAPID fill:#85C1E9,color:#000
    style SW fill:#85C1E9,color:#000
    style SUBS fill:#85C1E9,color:#000
    style PREF fill:#85C1E9,color:#000
    style TOGGLE fill:#85C1E9,color:#000
```

| Feature | Status | Notes |
|---------|--------|-------|
| In-App Notifications | ✅ Complete | Socket-delivered, persisted |
| Bell Popover | ✅ Complete | Accept/Decline invite actions |
| Notification Page | ✅ Complete | Infinite scroll, cursor pagination |
| Unread Badge | ✅ Complete | Real-time count |
| Web Push Notifications | ✅ Complete | VAPID-based |
| Service Worker | ✅ Complete | Push event handling |
| Subscription Management | ✅ Complete | Subscribe/unsubscribe API |
| Notification Preferences | ✅ Complete | Per-type toggles |
| Push Lifecycle | 🟡 Partial | No `pushsubscriptionchange` handler |

---

## 5. Auth & Users

| Feature | Status | Notes |
|---------|--------|-------|
| Email/Password Login | ✅ Complete | Supabase Auth |
| GitHub OAuth | ✅ Complete | Supabase Auth |
| Username OR Email Login | ✅ Complete | Server resolves username → email |
| Password Reset | ✅ Complete | Custom server-side flow |
| Session Persistence | ✅ Complete | Supabase SSR cookies |
| Edge Middleware Protection | ✅ Complete | Next.js middleware |
| JWKS Token Verification | ✅ Complete | Zero network calls |
| Profile Editing | ✅ Complete | Username, full name, bio |
| Avatar Upload | ✅ Complete | Supabase Storage |
| User Search | ✅ Complete | By username or full name |
| Status (AVAILABLE/AWAY/DND/INVISIBLE) | ✅ Complete | Presence-aware |

---

## 6. Invites

| Feature | Status | Notes |
|---------|--------|-------|
| Invite Link Generation | ✅ Complete | Token-based (32-byte random hex) |
| Invite Resolution | ✅ Complete | Token consume → entity join |
| Batch Invite | ✅ Complete | By user IDs |
| Email Invite (SendGrid) | ✅ Complete | HTML email with branded template |
| Multi-type Invites | ✅ Complete | USER, CONVERSATION, WORKSPACE, CHANNEL |
| Socket Room Join on Accept | ✅ Complete | Dynamic join, no reconnect needed |
| 24h Token Rotation | ✅ Complete | `lastUsedAt` tracking |

---

## 7. UI & Experience

| Feature | Status | Notes |
|---------|--------|-------|
| Responsive Layout | ✅ Complete | Mobile-first with md: breakpoints |
| Dark/Light/System Theme | ✅ Complete | `next-themes` |
| Settings Modal | ✅ Complete | Profile, appearance, notifications |
| Onboarding Flow | ✅ Complete | Multi-step wizard |
| Landing Page | ✅ Complete | Marketing site |
| Emoji Picker | ✅ Complete | `emoji-picker-react` |
| Markdown Rendering | ✅ Complete | Bold, italic, code, lists, tables |
| Tiptap Editor | ✅ Complete | Rich text + markdown message input |
| AlertDialog Confirmations | ✅ Complete | Replaced `window.confirm` |
| InfoPanel (Members/Pins) | ✅ Complete | Toggleable right panel |

---

## 8. Planned (Not Started)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Emoji Reactions | Medium | Medium | Schema exists — no endpoints or UI |
| @Mentions | Medium | Medium | No detection or autocomplete |
| File Uploads | Low | Large | No S3/cloud storage integration |
| Global Search (Cmd+K) | Low | Medium | No implementation |
| Message Threads | Low | Large | Nested replies, separate view |
| URL Unfurling | Low | Medium | No link preview |
| Keyboard Shortcuts | Low | Small | Cmd+K, Cmd+, |
| i18n Support | Low | Large | Hardcoded English throughout |
| E2E Tests | Medium | Large | Playwright — not started |
| Load Testing | Low | Medium | No k6/artillery scripts |
