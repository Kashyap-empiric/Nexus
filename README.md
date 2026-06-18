# Nexus

Nexus is a real-time messaging platform built as a full-stack TypeScript monorepo — a Slack-clone with workspaces, channels, DMs, in-app notifications, and web push notifications.

**Stack:** Next.js 16 + React 19 client, Express 5 server, Socket.io 4, PostgreSQL (Prisma 7), Supabase Auth, Upstash Redis, Tailwind CSS v4, TanStack Query, Zustand.

---

## Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL database (Supabase)
- pnpm (package manager)

### Setup

```bash
# 1. Install client dependencies
cd client && pnpm install

# 2. Install server dependencies
cd ../server && npm install

# 3. Configure environment
cp client/.env.example client/.env.local  # or create from docs
cp server/.env.example server/.env

# 4. Run database migrations
cd ../server && npx prisma generate && npx prisma migrate deploy

# 5. Start development servers
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && pnpm run dev
```

### Package Manager Notes

This project uses **pnpm** for the client and **npm** for the server.
- Client: `pnpm install` / `pnpm run dev` / `pnpm run build`
- Server: `npm install` / `npm run dev` / `npm run build`

> The old `client/package-lock.json` (npm) has been removed — only `pnpm-lock.yaml` is authoritative for the client.

---

## Architecture

```
Client (Next.js 16)          Server (Express 5)
┌─────────────────┐         ┌─────────────────────┐
│ TanStack Query   │ HTTP    │ REST API (Axios)    │
│ Zustand (UI)     │◄──────►│ Controllers/Services│
│ Socket.io Client │ WS      │ Socket.io Server    │
└────────┬─────────┘         └──────────┬──────────┘
         │                              │
         ▼                              ▼
   PostgreSQL (Prisma)          Upstash Redis
   (Supabase)                   (Presence)
```

### Client Modules
| Module | Directory | Purpose |
|--------|-----------|---------|
| auth | `modules/auth/` | Login, register, OAuth, session |
| chat | `modules/chat/` | ActiveConversation, NavigationRail, store |
| conversations | `modules/conversations/` | Sidebar, DM management |
| messages | `modules/messages/` | Message list, input, rendering |
| workspaces | `modules/workspaces/` | Workspaces, channels, members, roles |
| notifications | `modules/notifications/` | Bell, in-app, push notification |
| invites | `modules/invites/` | Invite links, batch invites |
| users | `modules/users/` | Profiles, search, status |
| settings | `modules/settings/` | Profile, appearance, notifications |
| onboarding | `modules/onboarding/` | New user wizard |

### Server Modules
| Module | Directory | Purpose |
|--------|-----------|---------|
| workspaces | `modules/workspaces/` | Workspace/channel CRUD, membership |
| conversations | `modules/conversations/` | DM management, read receipts |
| messages | `modules/messages/` | Message CRUD, pagination, pins |
| notifications | `modules/notifications/` | Notification CRUD, push subs |
| invites | `modules/invites/` | Invite generation, resolution |
| users | `modules/users/` | User profiles, search |
| auth | `modules/auth/` | Auth service, repository |

---

## Key Features

- **Real-time Messaging** — Socket.io: message send, edit, delete, read receipts
- **Direct Messages** — Full CRUD with `dmPair` deduplication
- **Workspaces & Channels** — Public/private channels, roles (OWNER/ADMIN/MEMBER)
- **Presence** — Online/offline with Redis + in-memory dual-write
- **Read Receipts** — Single checkmark (sent) / double checkmark (read)
- **Invite System** — Secure deep-linked invites (USER, WORKSPACE, CHANNEL)
- **In-App Notifications** — Bell popover, unread badges, infinite scroll
- **Web Push Notifications** — VAPID-based with service worker
- **Message Editing & Deletion** — REST endpoints with socket broadcasts
- **Markdown Rendering** — Bold, italic, code, lists via react-markdown
- **Responsive UI** — Mobile-first with dark/light/auto theme
- **Pinned Messages** — Pin/unpin with socket broadcasts
- **Channel Member Management** — Add/remove members, manage roles
- **Onboarding** — Multi-step wizard (profile → workspace)