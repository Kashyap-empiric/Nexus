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

---

## Environment Variables

See `.docs/ENVIRONMENT_VARIABLES.md` for a complete catalog.

Both client and server now use **Zod runtime validation** on startup. Missing or invalid variables will throw a clear error with the specific field names.

---

## Available Scripts

### Client (`cd client`)
| Script | Command |
|--------|---------|
| `pnpm run dev` | Start dev server (port 3001) |
| `pnpm run build` | Production build |
| `pnpm run lint` | ESLint check |

### Server (`cd server`)
| Script | Command |
|--------|---------|
| `npm run dev` | Start dev server with nodemon |
| `npm run build` | Build with tsup (includes prisma generate) |
| `npm run start` | Start production |
| `npm run lint` | TypeScript typecheck (no emit) |
| `npm run typecheck` | TypeScript typecheck (no emit) |

---

## Deployment

The repository includes `render.yaml` for deployment on Render. Both client and server services are defined with build scripts and environment configuration.

---

## Documentation

| Resource | Location | Purpose |
|----------|----------|---------|
| Project Context | `.docs/PROJECT_CONTEXT.md` | Current system state, status |
| Architecture | `.docs/ARCHITECTURE.md` | Architecture overview, data flow |
| Features | `.docs/FEATURES.md` | Feature inventory with status |
| Database Schema | `.docs/DATABASE.md` | Models, enums, migration rules |
| API Reference | `.docs/API_REFERENCE.md` | REST endpoints + socket events |
| Environment Vars | `.docs/ENVIRONMENT_VARIABLES.md` | All env vars with descriptions |
| Limitations | `.docs/LIMITATIONS.md` | Known limitations and tech debt |
| Changelog | `.docs/CHANGELOG.md` | Version history |
| Agent Rules | `.agents/AGENT_RULES.md` | Coding and architecture standards |

---

## Evaluation Context

This project has been evaluated with the following scores (scale: 0-10):

| Category | Score |
|----------|-------|
| Code Quality | 6/10 |
| Architecture | 8/10 |
| Maintainability | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Documentation | 7/10 |
| Testing | 2/10 |
| ESLint & Standards | 4/10 |
| Completeness | 8/10 |
| Professionalism | 7/10 |
| **Total** | **63/100** (Grade: C) |

**Key improvement areas:**
1. No automated tests (scored lowest at 2/10)
2. ESLint has 105 issues (54 errors, 51 warnings)
3. In-memory rate limiter not horizontally scalable
4. Stringly-typed error handling in controllers
5. Production console.log usage instead of structured logging
