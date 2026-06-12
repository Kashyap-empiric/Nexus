# Nexus — Architecture Restructure Plan

> **Target:** Domain-modular monolith with strict service-repository boundary and real-time transport layer separation
> **Scope:** Server-side restructuring (client-side re-organization is secondary)
> **Status:** Planning phase — no code changes yet

---

## Table of Contents

1. [Current Architecture (As-Is)](#1-current-architecture-as-is)
2. [Target Architecture (To-Be)](#2-target-architecture-to-be)
3. [Types Strategy: schema.ts vs types.ts](#3-types-strategy-schemats-vs-typests)
4. [Violations Inventory](#4-violations-inventory)
5. [Module-by-Module Migration Plan](#5-module-by-module-migration-plan)
6. [File Move/Change Table](#6-file-movechange-table)
7. [Schema for Repository Layer](#7-schema-for-repository-layer)
8. [Dependency Rule Enforcement](#8-dependency-rule-enforcement)
9. [Implementation Order](#9-implementation-order)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Current Architecture (As-Is)

### 1.1 Current Server Module Structure

```
server/src/
├── app.ts                           # Express app setup — inline Prisma query (/api/me)
├── server.ts                        # Entry point
├── lib/
│   ├── db.ts                        # PrismaClient singleton
│   └── redis.ts                     # Redis client
├── config/
│   └── env.ts                       # Environment variables
├── types/
│   └── shared.ts                    # AuthRequest type
├── utils/
│   └── jwt.ts                       # JWT verification
├── middlewares/                      # Express middlewares
│   ├── auth.ts                      # JWT auth middleware
│   ├── errorHandler.ts              # Global error handler
│   ├── rateLimiter.ts               # In-memory rate limiter
│   ├── validate.ts                  # Zod schema validation
│   └── requireConversationMember.ts # Membership guard — uses prisma DIRECTLY
├── shared/
│   ├── permissions.ts               # Permissions — uses prisma DIRECTLY
│   └── socket-events.ts             # Socket event constants
├── modules/
│   ├── conversations/
│   │   ├── conversations.controller.ts  # Controller — imports socket dispatcher
│   │   ├── conversations.service.ts     # Service — imports getIO() from socket, uses prisma DIRECTLY
│   │   ├── conversations.routes.ts      # Routes
│   │   └── conversations.schema.ts      # Zod schemas
│   ├── messages/
│   │   ├── messages.controller.ts       # Controller — imports socket dispatcher
│   │   ├── messages.service.ts          # Service — uses prisma DIRECTLY
│   │   ├── messages.routes.ts           # Routes
│   │   └── messages.schema.ts           # Zod schemas
│   ├── workspaces/
│   │   ├── workspaces.controller.ts     # Controller
│   │   ├── workspaces.service.ts        # Service — uses prisma DIRECTLY
│   │   ├── workspaces.routes.ts         # Routes
│   │   └── workspaces.schema.ts         # Zod schemas
│   ├── invites/
│   │   ├── invites.controller.ts        # Controller — imports getIO() + dispatcher
│   │   ├── invites.service.ts           # Service — uses prisma DIRECTLY
│   │   ├── invites.types.ts             # Types ✓ — only module with dedicated types
│   │   ├── invites.routes.ts            # Routes
│   │   └── resolvers/                   # Invite resolution strategies
│   │       ├── index.ts
│   │       ├── userResolver.ts          # Imports conversations.service
│   │       ├── conversationResolver.ts  # Uses prisma via tx
│   │       ├── workspaceResolver.ts     # Stub
│   │       └── channelResolver.ts       # Stub
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts             # Uses prisma DIRECTLY
│       ├── users.routes.ts
│       └── users.schema.ts
└── socket/
    ├── socket.ts                        # Socket init — uses prisma DIRECTLY for room joins
    ├── socket.dispatcher.ts             # Event dispatch helpers — defines types INLINE
    ├── socketErrors.ts                  # Error constants
    ├── presenceStore.ts                 # Redis + in-memory presence store
    ├── middlewares/
    │   ├── auth.ts                      # Socket auth middleware
    │   └── rateLimiter.ts               # Socket rate limiter
    └── handlers/
        ├── message.handler.ts           # SOCKET → messages.service
        ├── workspace.handler.ts         # SOCKET — uses prisma DIRECTLY
        └── presence.handler.ts          # SOCKET — uses presenceStore
```

### 1.2 Current Types Situation (The Gap)

Only **1 types file** exists across all server modules:

| Module | Has `types.ts`? | Types Currently Defined In |
|--------|-----------------|---------------------------|
| `conversations/` | ✗ | Inline in service + Prisma types used directly |
| `messages/` | ✗ | Inline in service + Prisma types used directly |
| `workspaces/` | ✗ | Inline in controller/service |
| `invites/` | ✓ `invites.types.ts` | Dedicated file — the pattern to follow |
| `users/` | ✗ | Inline in service |
| `socket/` | ✗ | Inline in `socket.dispatcher.ts` (`ConversationWithMembers`) |
| `shared/` | ✗ | Inline in `socket-events.ts` (`MessageReadPayload`, `InitialPresencePayload`) |

**Current type flow (broken):**

```
HTTP Request → Controller (uses Zod-inferred types) → Service (uses Prisma types directly) → prisma
```

**Problem:** Services depend on Prisma-generated types (`@prisma/client`), creating tight coupling between business logic and database schema. There is no layer of domain-specific interfaces.

### 1.3 Current Import Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                        SOCKET LAYER                          │
│  socket.ts ────→ prisma DIRECTLY (room joins)                │
│  workspace.handler.ts ────→ prisma DIRECTLY (channel query)  │
│  message.handler.ts ────→ messages.service (✓ correct)       │
│  presence.handler.ts ────→ presenceStore (✓ correct)         │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│  conversations.service.ts ────→ prisma DIRECTLY ✗            │
│  conversations.service.ts ────→ getIO() from socket ✗        │
│  messages.service.ts ────→ prisma DIRECTLY ✗                 │
│  workspaces.service.ts ────→ prisma DIRECTLY ✗               │
│  invites.service.ts ────→ prisma DIRECTLY ✗                  │
│  users.service.ts ────→ prisma DIRECTLY ✗                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER                           │
│  conversations.controller.ts ────→ socket.dispatcher ✗       │
│  messages.controller.ts ────→ socket.dispatcher (OK)         │
│  invites.controller.ts ────→ socket.dispatcher (OK)          │
│  workspaces.controller.ts ────→ permissions (OK)             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    PERMISSIONS LAYER                          │
│  permissions.ts ────→ prisma DIRECTLY (read-only, OK)        │
│  requireConversationMember.ts ────→ prisma DIRECTLY (auth)   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       NO REPOSITORY LAYER                    │
│  ✗ No repository files exist anywhere                       │
│  ✗ Services combine business logic + data access             │
└──────────────────────────────────────────────────────────────┘
```

### 1.4 Key Observations

| Aspect | Current State | Problem |
|--------|--------------|---------|
| **Repository Layer** | Does not exist | Every service has `import { prisma } from "@/lib/db"` |
| **Prisma Usage** | 8 files use `prisma.*` directly | `socket.ts`, `workspace.handler.ts`, 5 services, `permissions.ts`, `requireConversationMember.ts`, `app.ts` |
| **Types Files** | Only 1 module has `types.ts` | Types leak from Prisma into services; inline interfaces in dispatcher |
| **Service → Socket** | `conversations.service.ts` imports `getIO()` | Services should be transport-agnostic |
| **Socket → Prisma** | `socket.ts` and `workspace.handler.ts` query prisma directly | Socket is transport only — should call services |
| **Invite Resolver** | `userResolver.ts` imports `conversations.service.ts` | Cross-module dependency (acceptable but should go through service) |
| **app.ts Inline Query** | `/api/me` route has inline `prisma.user.findUnique` | Should use a user service/repository |

---

## 2. Target Architecture (To-Be)

### 2.1 Target Module Structure

```
server/src/
├── app.ts                           # Express app setup — NO inline Prisma queries
├── server.ts                        # Entry point
├── lib/
│   ├── db.ts                        # PrismaClient singleton (ONLY imported by repositories)
│   └── redis.ts                     # Redis client
├── config/
│   └── env.ts
├── types/
│   └── shared.ts
├── utils/
│   └── jwt.ts
├── middlewares/                      # Express middlewares
│   ├── auth.ts                      # JWT auth — calls auth service
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   ├── validate.ts
│   └── requireConversationMember.ts # Uses auth.repository (NOT prisma directly)
├── shared/
│   ├── permissions.ts               # Re-exports from auth module
│   └── socket-events.ts             # Socket event constants (keep as-is)
├── modules/
│   ├── auth/                        # NEW: Auth/permissions module
│   │   ├── auth.controller.ts       # NEW
│   │   ├── auth.service.ts          # NEW
│   │   ├── auth.repository.ts       # NEW: ONLY prisma queries for membership
│   │   ├── auth.types.ts            # NEW: MembershipResult, PermissionCheck
│   │   ├── auth.routes.ts           # NEW
│   │   └── auth.schema.ts           # NEW: Zod schemas for auth endpoints
│   ├── conversations/
│   │   ├── conversations.controller.ts  # Controller — dispatches socket events AFTER service call
│   │   ├── conversations.service.ts     # Service — pure business logic, NO prisma, NO socket
│   │   ├── conversations.repository.ts  # NEW: ONLY prisma.conversation.* queries
│   │   ├── conversations.types.ts       # NEW: ConversationDTO, DMPair, UnreadCountResult
│   │   ├── conversations.routes.ts
│   │   └── conversations.schema.ts      # Zod schemas for input validation only
│   ├── messages/
│   │   ├── messages.controller.ts       # Controller — dispatches socket events
│   │   ├── messages.service.ts          # Service — pure business logic
│   │   ├── messages.repository.ts       # NEW: ONLY prisma.message.* queries
│   │   ├── messages.types.ts            # NEW: MessageDTO, MessagePage, CreateMessageDTO
│   │   ├── messages.routes.ts
│   │   └── messages.schema.ts           # Zod schemas for input validation only
│   ├── workspaces/
│   │   ├── workspaces.controller.ts     # Controller
│   │   ├── workspaces.service.ts        # Service — calls conversations.service for channel creation
│   │   ├── workspaces.repository.ts     # NEW: ONLY prisma queries for workspaces/workspaceMembers
│   │   ├── workspaces.types.ts          # NEW: WorkspaceDTO, WorkspaceMemberDTO
│   │   ├── workspaces.routes.ts
│   │   └── workspaces.schema.ts         # Zod schemas for input validation only
│   ├── invites/
│   │   ├── invites.controller.ts        # Controller — dispatches socket events
│   │   ├── invites.service.ts           # Service — pure business logic
│   │   ├── invites.repository.ts        # NEW: ONLY prisma.invite.* queries
│   │   ├── invites.types.ts             # KEEP existing — already correct pattern
│   │   ├── invites.routes.ts
│   │   └── resolvers/
│   │       ├── index.ts
│   │       ├── userResolver.ts
│   │       ├── conversationResolver.ts
│   │       ├── workspaceResolver.ts
│   │       └── channelResolver.ts
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts          # NEW: ONLY prisma.user.* queries
│       ├── users.types.ts               # NEW: UserSearchResult, UserSearchParams
│       ├── users.routes.ts
│       └── users.schema.ts              # Zod schemas for input validation only
└── socket/
    ├── socket.ts                        # Socket init — calls conversation service for room joins
    ├── socket.dispatcher.ts             # Event dispatch helpers — imports types from modules
    ├── socket.types.ts                  # NEW: DispatchedEvent, DispatchPayload types
    ├── socketErrors.ts                  # Error constants
    ├── presenceStore.ts                 # Redis + in-memory presence store
    ├── middlewares/
    │   ├── auth.ts
    │   └── rateLimiter.ts
    └── handlers/
        ├── message.handler.ts           # SOCKET → messages.service (✓ correct)
        ├── workspace.handler.ts         # SOCKET → workspaces.service (FIXED)
        └── presence.handler.ts
```

### 2.2 Target Import Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  React/Next.js — NEVER enforces access control               │
│  UI state only (DM vs WORKSPACE mode)                        │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                 CONTROLLER / HANDLER LAYER                    │
│  HTTP controllers → services, then dispatches socket events  │
│  Socket handlers → services (transport only)                 │
│  Reads types from: module.types.ts                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                              │
│  Pure business logic — NO prisma, NO socket                  │
│  Only domain rules, orchestration, validation                │
│  Reads/Writes types from: module.types.ts                    │
│  Examples: "DM vs CHANNEL logic" lives here only             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                   REPOSITORY / DAL LAYER                     │
│  ONLY place prisma.* is allowed                              │
│  Stateless, no business logic                                │
│  One repository per module                                   │
│  Accepts/returns types from: module.types.ts                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                        DATABASE                               │
│  Prisma ORM → PostgreSQL                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              PERMISSIONS / AUTH (Cross-cutting)              │
│  Read-only DB queries via auth.repository only               │
│  No business logic, no service imports                       │
└──────────────────────────────────────────────────────────────┘

NO backward imports allowed.
NO prisma.* outside repository layer.
NO socket logic in services.
NO business logic in controllers/handlers.
```

---

## 3. Types Strategy: `schema.ts` vs `types.ts`

This is a critical distinction the current codebase gets wrong. Every module needs **two** "type" files with different responsibilities:

### 3.1 File Responsibilities

| File | Purpose | Content | Who Imports It |
|------|---------|---------|----------------|
| `schema.ts` | **Input validation** only | Zod schemas + inferred input types | Controllers (for `validate()` middleware), tests |
| `types.ts` | **Domain interfaces & DTOs** | Service input/output interfaces, repository contracts, internal types | Services, repositories, controllers, socket handlers |

### 3.2 What Goes Where

```
schema.ts (thin — only what comes from HTTP)
├── Zod validation schemas
├── Inferred input types (z.infer<typeof ...>)
└── MUST NOT contain: domain logic types, repository types, internal DTOs

types.ts (thick — everything that flows internally)
├── Service input/output interfaces (DTOs)
├── Repository query/result types
├── Domain value types (e.g., DMPair, WorkspaceRole)
├── Composite types (e.g., ConversationWithMembers)
├── Shared module event types
└── MUST NOT contain: Zod schemas, HTTP-specific validation
```

### 3.3 Current vs Target: Types Flow

**Current (broken):**
```
schema.ts (Zod) → Controller → Service (Prisma types inline) → prisma
                                  ↕
                          No types.ts — interfaces defined inline in .service.ts
```

**Target (clean):**
```
schema.ts (Zod) → Controller → Service (module.types.ts) → Repository (module.types.ts) → prisma
                                  ↕                          ↕
                          domain types defined here    extends/re-uses types from here
```

### 3.4 What Each Module's `types.ts` Should Define

| Module | Types to Define |
|--------|----------------|
| **conversations.types.ts** | `ConversationDTO`, `ConversationWithMembers`, `DMPair`, `UnreadCountResult`, `CreateConversationDTO`, `ConversationListResult`, `ChannelResult` |
| **messages.types.ts** | `MessageDTO`, `MessageWithUser`, `MessagePage`, `CreateMessageDTO`, `UpdateMessageDTO`, `MessageDeleteResult`, `ConversationMetadata` |
| **workspaces.types.ts** | `WorkspaceDTO`, `WorkspaceWithMembers`, `WorkspaceMemberDTO`, `CreateWorkspaceDTO`, `ChannelListResult` |
| **invites.types.ts** | Already exists and is well-structured — keep as-is. `ResolveInviteParams`, `GenerateInviteParams`, `ResolveInviteResult`, `GenerateInviteResult`, `DomainEvent` |
| **users.types.ts** | `UserSearchResult`, `UserSearchParams`, `UserProfileDTO` |
| **auth.types.ts** | `MembershipResult`, `PermissionCheck`, `ConversationAccess`, `WorkspaceAccess` |
| **socket.types.ts** | `DispatchedEvent`, `DispatchPayload`, `ConversationWithMembers` (moved from inline in dispatcher.ts) |

### 3.5 Example: conversations.types.ts

```typescript
// modules/conversations/conversations.types.ts
//
// Domain interfaces for conversations module.
// These types flow between controller → service → repository.
// NO Zod schemas, NO prisma imports.

// ──── Value Types ────

export type DMPair = string; // `${sorted(userA)}:${sorted(userB)}`

// ──── DTOs (what services return) ────

export interface UserDTO {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationMemberDTO {
  id: string;
  userId: string;
  lastReadMessageId: string | null;
  user: UserDTO;
}

export interface LatestMessageDTO {
  id: string;
  userId: string;
  content: string;
  deletedAt: string | null;
  createdAt: string;
  user: { username: string };
}

export interface ConversationDTO {
  id: string;
  type: "DM" | "CHANNEL";
  isPrivate: boolean;
  name: string | null;
  dmPair: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  latestMessageId: string | null;
  members: ConversationMemberDTO[];
  latestMessage: LatestMessageDTO | null;
  unreadCount: number;
}

// ──── Service Input DTOs ────

export interface CreateConversationDTO {
  targetUserId: string;
}

// ──── Repository Return Types ────

export interface UnreadCountResult {
  conversationId: string;
  unreadCount: number;
}

export interface ConversationListResult {
  conversations: ConversationDTO[];
  unreadCounts: UnreadCountResult[];
}
```

### 3.6 Example: messages.types.ts

```typescript
// modules/messages/messages.types.ts
//
// Domain interfaces for messages module.

import type { UserDTO } from "../conversations/conversations.types";

// ──── DTOs ────

export interface MessageDTO {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  isEdited: boolean;
  deletedAt: string | null;
  createdAt: string;
  user: UserDTO;
}

export interface MessagePage {
  messages: MessageDTO[];
  nextCursor: string | null;
}

export interface ConversationMetadataDTO {
  id: string;
  name: string | null;
  updatedAt: string;
  latestMessageId: string | null;
  latestMessage?: LatestMessageForMeta | null;
}

export interface LatestMessageForMeta {
  id: string;
  userId: string;
  content: string;
  deletedAt: string | null;
  createdAt: string;
  user: { username: string };
}

// ──── Service Input DTOs ────

export interface CreateMessageDTO {
  conversationId: string;
  userId: string;
  content: string;
}

export interface UpdateMessageDTO {
  messageId: string;
  userId: string;
  content: string;
}

export interface DeleteMessageDTO {
  messageId: string;
  userId: string;
}

// ──── Repository Results ────

export interface CreateMessageResult {
  message: MessageDTO;
  conversationMetadata: ConversationMetadataDTO;
}
```

### 3.7 Example: auth.types.ts

```typescript
// modules/auth/auth.types.ts
//
// Types for cross-cutting auth/permissions layer.

export interface MembershipCheck {
  isMember: boolean;
}

export interface WorkspaceAccess {
  isMember: boolean;
  role: "ADMIN" | "MEMBER" | null;
}

export interface ConversationAccess {
  isMember: boolean;
  conversationType: "DM" | "CHANNEL" | null;
}
```

---

## 4. Violations Inventory

### VIOLATION 1: No Repository Layer (CRITICAL)

**Severity:** HIGH
**Impact:** Every PRISMA query violates the architecture

| File | Violation |
|------|-----------|
| `server/src/modules/conversations/conversations.service.ts` | `prisma.conversation.findMany`, `prisma.conversation.create`, `prisma.conversation.findUnique`, `prisma.conversationMember.update`, `prisma.message.count` |
| `server/src/modules/messages/messages.service.ts` | `prisma.message.findMany`, `prisma.message.create`, `prisma.message.findUnique`, `prisma.message.update`, `prisma.$transaction`, `prisma.conversation.update`, `prisma.conversationMember.update` |
| `server/src/modules/workspaces/workspaces.service.ts` | `prisma.conversation.findMany` |
| `server/src/modules/users/users.service.ts` | `prisma.user.findMany` |
| `server/src/modules/invites/invites.service.ts` | `prisma.invite.findUnique`, `prisma.invite.create`, `prisma.invite.update`, `prisma.invite.findFirst`, `prisma.invite.updateMany`, `prisma.conversation.findUnique`, `prisma.$transaction` |

**Total:** 7 service files using `prisma.*` directly

---

### VIOLATION 2: Socket Layer Uses Prisma Directly (CRITICAL)

**Severity:** HIGH
**Impact:** Violates "socket = transport only" rule

| File | Line(s) | Violation |
|------|---------|-----------|
| `server/src/socket/socket.ts` | 48-57 | `prisma.conversationMember.findMany` — queries DM rooms for new socket connections |
| `server/src/socket/handlers/workspace.handler.ts` | 27 | `prisma.conversation.findMany` — queries channels in workspace:join handler |

**Fix:** Both should call service layer methods

---

### VIOLATION 3: Service Layer Imports Socket (MEDIUM)

**Severity:** MEDIUM
**Impact:** Services become transport-aware (breaks separation of concerns)

| File | Line(s) | Violation |
|------|---------|-----------|
| `server/src/modules/conversations/conversations.service.ts` | 3 | `import { getIO } from "@/socket/socket"` — dead import, `getIO` is never called |

**Note:** This is dead code from a previous refactor. Remove during migration.

---

### VIOLATION 4: Controllers Import Socket Dispatcher (MINOR — ACCEPTABLE)

**Severity:** LOW
**Impact:** This is the correct pattern per the architecture

| File | Line(s) | Status |
|------|---------|--------|
| `server/src/modules/conversations/conversations.controller.ts` | 5 | `import { dispatchConversationNew, dispatchMessageRead }` — ✓ Correct pattern |
| `server/src/modules/messages/messages.controller.ts` | 5 | `import { dispatchMessageEvent }` — ✓ Correct pattern |
| `server/src/modules/invites/invites.controller.ts` | 5 | `import { getIO }` — ⚠️ Should use dispatcher, not raw getIO |

---

### VIOLATION 5: Middleware Uses Prisma Directly (MEDIUM)

**Severity:** MEDIUM
**Impact:** Bypasses repository layer

| File | Line(s) | Violation |
|------|---------|-----------|
| `server/src/middlewares/requireConversationMember.ts` | 19 | `prisma.conversationMember.findUnique` — auth middleware doing read-only DB query |

**Fix:** Should call auth.repository

---

### VIOLATION 6: app.ts Has Inline Prisma Query (LOW)

**Severity:** LOW
**Impact:** Minor violation at application entry level

| File | Line(s) | Violation |
|------|---------|-----------|
| `server/src/app.ts` | 32 | `prisma.user.findUnique` in `/api/me` handler |

**Fix:** Should call users.service or auth.repository

---

### VIOLATION 7: Permissions Layer Uses Prisma Directly (MINOR — ACCEPTABLE)

**Severity:** LOW
**Impact:** Architecture allows auth layer to do minimal read-only DB queries

| File | Line(s) | Status |
|------|---------|--------|
| `server/src/shared/permissions.ts` | 4, 16 | `prisma.workspaceMember.findUnique`, `prisma.conversationMember.findUnique` |

**Accepted per architecture:** Auth layer = read-only DB queries (minimal). Refactor to `auth.repository.ts` for consistency.

---

### VIOLATION 8: Types Are Scattered or Missing (MEDIUM)

**Severity:** MEDIUM
**Impact:** Prisma types leak into services. Domain boundaries are unclear.

| File | Issue |
|------|-------|
| `server/src/modules/conversations/` | No `types.ts` — Prisma types used directly in service |
| `server/src/modules/messages/` | No `types.ts` — Prisma types used directly in service |
| `server/src/modules/workspaces/` | No `types.ts` — types defined inline in controller |
| `server/src/modules/users/` | No `types.ts` — types defined inline in service |
| `server/src/socket/socket.dispatcher.ts` | `ConversationWithMembers` type defined inline — should be in `socket.types.ts` or `conversations.types.ts` |

---

## 5. Module-by-Module Migration Plan

### MODULE 1: Conversations Module

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `conversations.types.ts` | **CREATE** | Domain interfaces: `ConversationDTO`, `ConversationWithMembers`, `DMPair`, `UnreadCountResult`, `CreateConversationDTO` |
| `conversations.repository.ts` | **CREATE** | Stateless functions: `findById`, `findDMsByUserId`, `findDMByPair`, `createDM`, `updateLastReadMessage`, `countUnreadMessages`, `findChannelByWorkspaceId` |
| `conversations.service.ts` | **MODIFY** | Remove ALL `prisma.*` calls → import repository. Remove `getIO` import. Keep business logic (`buildDmPair`, unread count calculation, `createOrGetDM` with P2002 handling). Use types from `conversations.types.ts`. |
| `conversations.controller.ts` | **MODIFY** | Keep socket dispatcher imports. No logic change needed. |
| `conversations.schema.ts` | **MODIFY** | Keep only Zod schemas. Move inferred types if they represent domain types (keep input-only types here). |

#### Repository API:

```typescript
// conversations.repository.ts
export const findById = (id: string) => prisma.conversation.findUnique({ ... })
export const findDMsByUserId = (userId: string) => prisma.conversation.findMany({ ... })
export const findDMByPair = (dmPair: string) => prisma.conversation.findUnique({ ... })
export const createDM = (data: CreateConversationData) => prisma.conversation.create({ ... })
export const updateLastReadMessage = (conversationId: string, userId: string, messageId: string) => prisma.conversationMember.update({ ... })
export const countUnreadMessages = (conversationId: string, userId: string, lastReadMessageId?: string) => prisma.message.count({ ... })
export const findChannelByWorkspaceId = (workspaceId: string) => prisma.conversation.findMany({ ... })
```

---

### MODULE 2: Messages Module

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `messages.types.ts` | **CREATE** | `MessageDTO`, `MessagePage`, `ConversationMetadataDTO`, `CreateMessageDTO`, `UpdateMessageDTO`, `DeleteMessageDTO`, `CreateMessageResult` |
| `messages.repository.ts` | **CREATE** | `findMessages`, `createMessage` (transaction), `findById`, `updateMessage`, `deleteMessage`, `findNextLatestMessage` (tx variant), `updateConversationInTransaction` |
| `messages.service.ts` | **MODIFY** | Move ALL `prisma.*` calls to repository. Keep business logic (ownership validation `message.userId !== userId`, edit/delete rules, `getMessageById` + validation flow). Use types from `messages.types.ts`. |
| `messages.controller.ts` | **MODIFY** | Already correct — keeps socket dispatcher pattern |
| `messages.schema.ts` | **MODIFY** | Keep only Zod schemas for HTTP input validation |

#### Repository API:

```typescript
// messages.repository.ts
export const findMessages = (conversationId: string, cursor?: string, limit?: number) => prisma.message.findMany({ ... })
export const createMessageTransaction = (data: CreateMessageTxData) => prisma.$transaction([ ... ])
export const findById = (messageId: string) => prisma.message.findUnique({ ... })
export const updateMessage = (messageId: string, data: UpdateMessageData) => prisma.message.update({ ... })
export const findNextLatestMessage = (tx: Prisma.TransactionClient, conversationId: string, excludedId: string) => tx.message.findFirst({ ... })
export const updateConversationInTransaction = (tx: Prisma.TransactionClient, conversationId: string, latestMessageId: string | null) => tx.conversation.update({ ... })
```

---

### MODULE 3: Workspaces Module

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `workspaces.types.ts` | **CREATE** | `WorkspaceDTO`, `WorkspaceMemberDTO`, `ChannelListResult`, `CreateWorkspaceDTO` |
| `workspaces.repository.ts` | **CREATE** | Workspace + workspaceMember queries. Channel queries live in conversations.repository. |
| `workspaces.service.ts` | **MODIFY** | Replace `prisma.conversation.findMany` with call to conversations.repository (via conversations.service). |
| `workspaces.controller.ts` | **MODIFY** | Already correct |

#### Design Decision: Channel vs Conversation Domain

Since CHANNEL is a `Conversation` type (`type: "CHANNEL"`), there's a domain ambiguity:
- Workspaces module owns workspace lifecycle + membership
- Conversations module owns the Conversation entity

**Decision:** Channel queries (`findChannelByWorkspaceId`) live in **conversations.repository** because they query the `conversation` table. The workspaces service calls conversations.service for channel operations. This respects domain ownership.

---

### MODULE 4: Invites Module

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `invites.types.ts` | **KEEP** | Already well-structured. Add any missing types if needed. |
| `invites.repository.ts` | **CREATE** | `findInviteByToken`, `createInvite`, `updateInvite`, `findExistingActiveInvite`, `consumeInviteAtomic` (tx variant), `findConversationByEntityId`, `deleteInvitesForEntity` (tx variant) |
| `invites.service.ts` | **MODIFY** | Move ALL `prisma.*` calls to repository. Keep business logic (validation, 24h rotation policy, generation). |
| `invites.controller.ts` | **MODIFY** | Replace raw `getIO()` call with dispatcher function |

#### Transaction Handling:

The `resolveInviteService` uses `prisma.$transaction(async (tx) => { ... })` and passes `tx` to resolvers. Repositories must expose `*InTransaction` variants:

```typescript
// invites.repository.ts
export const consumeInviteAtomic = (tx: Prisma.TransactionClient, inviteId: string) =>
  tx.$executeRaw`UPDATE "Invite" SET "usedCount" = "usedCount" + 1, "lastUsedAt" = NOW() WHERE "id" = ${inviteId} AND ...`
```

---

### MODULE 5: Users Module

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `users.types.ts` | **CREATE** | `UserSearchResult`, `UserSearchParams`, `UserProfileDTO` |
| `users.repository.ts` | **CREATE** | `searchUsers` |
| `users.service.ts` | **MODIFY** | Move `prisma.user.findMany` to repository. |
| `users.controller.ts` | **MODIFY** | Already correct |

---

### MODULE 6: Socket Layer

#### Files involved:

| File | Action | Details |
|------|--------|---------|
| `socket.types.ts` | **CREATE** | Move `ConversationWithMembers` from dispatcher.ts. Add `DispatchedEvent`, `DispatchPayload` types. |
| `socket.ts` | **MODIFY** | Replace `prisma.conversationMember.findMany` with call to conversations.service. |
| `workspace.handler.ts` | **MODIFY** | Replace `prisma.conversation.findMany` with call to workspaces.service (which delegates to conversations.service). |
| `invites.controller.ts` | **MODIFY** | Replace direct `getIO()` with dispatcher pattern |
| `socket.dispatcher.ts` | **MODIFY** | Remove inline `ConversationWithMembers` — import from `socket.types.ts` or `conversations.types.ts` |

---

### MODULE 7: Permissions/Auth Module (NEW)

#### Files to create:

| File | Action | Details |
|------|--------|---------|
| `modules/auth/auth.types.ts` | **CREATE** | `MembershipCheck`, `WorkspaceAccess`, `ConversationAccess` |
| `modules/auth/auth.repository.ts` | **CREATE** | Move `prisma.workspaceMember.findUnique` and `prisma.conversationMember.findUnique` here from `shared/permissions.ts` |
| `modules/auth/auth.service.ts` | **CREATE** | `isWorkspaceMember()`, `verifyConversationMembership()` — thin wrappers over repository. |
| `modules/auth/auth.controller.ts` | **CREATE** | For `/api/me` endpoint (if moved from app.ts) |
| `modules/auth/auth.routes.ts` | **CREATE** | Auth routes |
| `modules/auth/auth.schema.ts` | **CREATE** | Zod schemas |

#### Existing files to modify:

| File | Action | Details |
|------|--------|---------|
| `shared/permissions.ts` | **MODIFY** | Re-export from auth module OR delete and update imports. **Recommendation:** Re-export for backward compatibility during migration, then migrate callers. |
| `middlewares/requireConversationMember.ts` | **MODIFY** | Replace `prisma.conversationMember.findUnique` with `auth.service.verifyConversationMembership()` |
| `app.ts` | **MODIFY** | Replace inline `prisma.user.findUnique` with `auth.repository.findUserById()` or keep in `app.ts` but use repository |

---

### MODULE 8: Frontend — Minor Restructure Only

The frontend is already well-structured with:
- Clear module separation (`modules/chat/`, `modules/auth/`, `modules/users/`, `modules/landing/`)
- Zustand for UI state (DM vs WORKSPACE mode)
- TanStack Query for server state
- Socket client handlers separated into `realtime/` directory
- `types/` subdirectory with `conversation.ts`, `message.ts`, `socket.ts` — already good

**Minor improvements:**
- Rename `chat` module to `messaging` or `conversations` to match server module naming
- Extract workspace-specific hooks/components from `chat` module if workspace feature grows
- Add `workspace.ts` types file if one doesn't exist yet

---

## 6. File Move/Change Table

### New Files to Create

| # | New File | Source |
|---|----------|--------|
| 1 | `server/src/modules/conversations/conversations.types.ts` | Domain types extracted from service |
| 2 | `server/src/modules/conversations/conversations.repository.ts` | ALL `prisma.*` calls from `conversations.service.ts` |
| 3 | `server/src/modules/messages/messages.types.ts` | Domain types extracted from service |
| 4 | `server/src/modules/messages/messages.repository.ts` | ALL `prisma.*` calls from `messages.service.ts` |
| 5 | `server/src/modules/workspaces/workspaces.types.ts` | Domain types extracted from service |
| 6 | `server/src/modules/workspaces/workspaces.repository.ts` | Workspace + membership queries (channels via conversations.repo) |
| 7 | `server/src/modules/invites/invites.repository.ts` | ALL `prisma.*` calls from `invites.service.ts` |
| 8 | `server/src/modules/users/users.types.ts` | Domain types extracted from service |
| 9 | `server/src/modules/users/users.repository.ts` | `prisma.*` calls from `users.service.ts` |
| 10 | `server/src/modules/auth/auth.types.ts` | Permission/membership types |
| 11 | `server/src/modules/auth/auth.repository.ts` | `prisma.*` calls from `shared/permissions.ts` + `middlewares/requireConversationMember.ts` |
| 12 | `server/src/modules/auth/auth.service.ts` | Thin wrappers over auth.repository |
| 13 | `server/src/modules/auth/auth.controller.ts` | For `/api/me` endpoint |
| 14 | `server/src/modules/auth/auth.routes.ts` | Auth routes |
| 15 | `server/src/modules/auth/auth.schema.ts` | Zod schemas for auth endpoints |
| 16 | `server/src/socket/socket.types.ts` | Types extracted from `socket.dispatcher.ts` |

### Existing Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `server/src/modules/conversations/conversations.service.ts` | Remove `prisma.*` calls, `getIO` import. Import repository + types. |
| 2 | `server/src/modules/conversations/conversations.schema.ts` | Keep only Zod schemas |
| 3 | `server/src/modules/messages/messages.service.ts` | Remove `prisma.*` calls. Import repository + types. |
| 4 | `server/src/modules/messages/messages.schema.ts` | Keep only Zod schemas |
| 5 | `server/src/modules/workspaces/workspaces.service.ts` | Remove `prisma.*` calls. Import repository + types. |
| 6 | `server/src/modules/invites/invites.service.ts` | Remove `prisma.*` calls. Import repository. |
| 7 | `server/src/modules/invites/invites.controller.ts` | Replace `getIO()` with dispatcher |
| 8 | `server/src/modules/users/users.service.ts` | Remove `prisma.*` calls. Import repository + types. |
| 9 | `server/src/modules/users/users.schema.ts` | Keep only Zod schemas |
| 10 | `server/src/middlewares/requireConversationMember.ts` | Replace `prisma.*` with `auth.service` |
| 11 | `server/src/shared/permissions.ts` | Re-export from auth module OR update all callers |
| 12 | `server/src/socket/socket.ts` | Replace `prisma.conversationMember.findMany` with service call |
| 13 | `server/src/socket/handlers/workspace.handler.ts` | Replace `prisma.conversation.findMany` with service call |
| 14 | `server/src/socket/socket.dispatcher.ts` | Import types from `socket.types.ts` (remove inline `ConversationWithMembers`) |
| 15 | `server/src/app.ts` | Replace inline `prisma.user.findUnique` with service/repo call |

### Files to Delete

| # | File | Reason |
|---|------|--------|
| — | None | All existing files are modified, not deleted |

---

## 7. Schema for Repository Layer

### 7.1 Repository Pattern Template

```typescript
// modules/<module>/<module>.repository.ts

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SomeDTO } from "./<module>.types";

// — Read Operations (return types from types.ts) —

export const findById = (id: string): Promise<SomeDTO | null> => { ... };
export const findAll = (filter?: SomeFilter): Promise<SomeDTO[]> => { ... };

// — Write Operations —

export const create = (data: CreateData): Promise<SomeDTO> => { ... };
export const update = (id: string, data: UpdateData): Promise<SomeDTO> => { ... };

// — Transaction Support (when service needs atomicity) —

export const createInTransaction = (tx: Prisma.TransactionClient, data: CreateData) => { ... };
export const updateInTransaction = (tx: Prisma.TransactionClient, id: string, data: UpdateData) => { ... };
```

### 7.2 Repository Rules

1. **STATELESS** — No class instances, no constructor, no state. Pure functions only.
2. **NO BUSINESS LOGIC** — No if/else on domain rules. No ownership checks. No "DM vs CHANNEL" branching.
3. **TYPES FROM types.ts** — Return types come from the module's `types.ts` file, not raw Prisma types (except for simple pass-through queries).
4. **TRANSACTION VARIANTS** — When a service needs atomic operations, the repository exposes `*InTransaction` variants that accept `Prisma.TransactionClient`.
5. **SOFT DELETE AWARENESS** — All read operations on entities with `deletedAt` MUST filter `deletedAt: null`.
6. **SINGLE RESPONSIBILITY** — Each repository method does exactly one database operation. Complex queries (multiple includes/relations) are fine, but no branching logic.

### 7.3 Example: Conversations Repository

```typescript
// modules/conversations/conversations.repository.ts

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { ConversationDTO } from "./conversations.types";

// ====== Reads ======

export const findById = (id: string, includeMembers = false): Promise<ConversationDTO | null> =>
  prisma.conversation.findUnique({
    where: { id },
    include: includeMembers
      ? { members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } }
      : undefined,
  });

export const findDMsByUserId = (userId: string): Promise<ConversationDTO[]> =>
  prisma.conversation.findMany({
    where: { members: { some: { userId } }, type: "DM", workspaceId: null },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      latestMessage: { select: { id: true, userId: true, content: true, deletedAt: true, createdAt: true, user: { select: { username: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

export const findDMByPair = (dmPair: string) =>
  prisma.conversation.findUnique({
    where: { dmPair },
    include: { members: { include: { user: true } } },
  });

// ====== Writes ======

export const createDM = (data: CreateDMData) =>
  prisma.conversation.create({
    data,
    include: { members: { include: { user: true } } },
  });

export const updateLastReadMessage = (conversationId: string, userId: string, messageId: string) =>
  prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadMessageId: messageId },
  });

export const countUnreadMessages = (conversationId: string, userId: string, lastReadMessageId?: string) =>
  prisma.message.count({
    where: {
      conversationId,
      userId: { not: userId },
      ...(lastReadMessageId ? { id: { gt: lastReadMessageId } } : {}),
    },
  });

export const findChannelByWorkspaceId = (workspaceId: string) =>
  prisma.conversation.findMany({
    where: { workspaceId, type: "CHANNEL" },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      latestMessage: { select: { id: true, userId: true, content: true, deletedAt: true, createdAt: true, user: { select: { username: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
```

---

## 8. Dependency Rule Enforcement

### 8.1 Import Rules (to enforce with ESLint)

```jsonc
// .eslintrc.json — Import restriction rules
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          // Socket MUST NOT import prisma
          {
            "name": "@/lib/db",
            "importNames": ["prisma"],
            "message": "Socket layer must NOT use Prisma directly. Use service layer.",
            "allowImportNames": [],
            "include": ["server/src/socket/**"]
          },
          // Services MUST NOT import prisma
          {
            "name": "@/lib/db",
            "importNames": ["prisma"],
            "message": "Services must NOT use Prisma directly. Use repository layer.",
            "allowImportNames": [],
            "include": ["server/src/modules/**/services/**"]
          },
          // Services MUST NOT import socket
          {
            "name": "@/socket/*",
            "message": "Services must NOT import socket. Dispatch events from controllers/handlers.",
            "include": ["server/src/modules/**/services/**"]
          },
          // Repositories MUST NOT import services
          {
            "name": "@/modules/*/*.service",
            "message": "Repositories must NOT import services.",
            "include": ["server/src/modules/**/repositories/**"]
          },
          // Controllers MUST NOT import prisma
          {
            "name": "@/lib/db",
            "importNames": ["prisma"],
            "message": "Controllers must NOT use Prisma directly. Use services or repositories.",
            "include": ["server/src/modules/**/controllers/**"]
          }
        ],
        "patterns": [
          // Only repositories may import prisma from @/lib/db
          {
            "group": ["@/lib/db"],
            "message": "Only repository files may import prisma.",
            "exclude": ["server/src/modules/*/*.repository.ts"]
          }
        ]
      }
    ]
  }
}
```

### 8.2 Type Import Rules

| Layer | Can Import Types From | Example |
|-------|----------------------|---------|
| Controller | `types.ts` of its own module + shared | `import type { ConversationDTO } from "./conversations.types"` |
| Service | `types.ts` of its own module + other modules' service types | `import type { MessageDTO } from "../messages/messages.types"` |
| Repository | `types.ts` of its own module + Prisma types | `import type { ConversationDTO } from "./conversations.types"` |
| Socket | `types.ts` of any module | `import type { ConversationWithMembers } from "../modules/conversations/conversations.types"` |

### 8.3 Manual Code Review Checklist

- [ ] Does this file import `prisma`? It should be a `.repository.ts` file.
- [ ] Does this service import socket? It should not — controllers/handlers emit events.
- [ ] Does this socket handler contain business logic? It should only call services.
- [ ] Does this controller have inline Prisma queries? They should be delegated.
- [ ] Does this file define inline interfaces? They should be in a `types.ts` file.
- [ ] Does this `schema.ts` contain domain types (not just Zod)? Move them to `types.ts`.
- [ ] Does the frontend filter security data? It should not — server decides access.

---

## 9. Implementation Order

The migration should be done in phases, ordered by risk level and dependency chain.

### Phase 0: Create All Types Files (Foundation)

Create types files first so all other steps can import them:

```
Step 1:  conversations.types.ts        — ConversationDTO, DMPair, UnreadCountResult
Step 2:  messages.types.ts             — MessageDTO, MessagePage, ConversationMetadata
Step 3:  workspaces.types.ts           — WorkspaceDTO, WorkspaceMemberDTO
Step 4:  users.types.ts                — UserSearchResult
Step 5:  auth.types.ts                 — MembershipCheck, WorkspaceAccess
Step 6:  socket.types.ts               — DispatchedEvent types (moved from dispatcher.ts)
```

### Phase 1: Create All Repository Files

```
Step 7:  users.repository.ts           — Simple, no transactions
Step 8:  conversations.repository.ts   — Medium complexity
Step 9:  messages.repository.ts        — Complex (transactions)
Step 10: workspaces.repository.ts      — Simple workspace membership queries only
Step 11: invites.repository.ts         — Complex (transaction client patterns)
Step 12: auth.repository.ts            — Simple read-only queries
```

### Phase 2: Refactor All Services

```
Step 13: users.service.ts              — Replace prisma with users.repository
Step 14: conversations.service.ts      — Replace prisma, remove getIO import
Step 15: messages.service.ts           — Replace prisma with messages.repository
Step 16: workspaces.service.ts         — Replace prisma with repository/service calls
Step 17: invites.service.ts            — Replace prisma with invites.repository
```

### Phase 3: Create Auth Module & Fix Middleware

```
Step 18: Create auth.service.ts        — Wire up auth.repository
Step 19: Create auth.controller.ts     — Wire up /api/me (optional)
Step 20: Create auth.routes.ts         — Auth routes
Step 21: Modify requireConversationMember.ts  — Use auth.service
Step 22: Modify shared/permissions.ts  — Re-export from auth module
```

### Phase 4: Fix Socket Violations & Dispatcher

```
Step 23: workspace.handler.ts          — Replace prisma with workspaces.service call
Step 24: socket.ts                     — Replace prisma with conversations.service call
Step 25: socket.dispatcher.ts          — Import types from socket.types.ts
```

### Phase 5: Clean Up

```
Step 26: invites.controller.ts         — Replace getIO() with dispatcher
Step 27: app.ts (/api/me)              — Replace inline prisma with auth.repository
Step 28: Verify no more prisma imports outside repository layer
Step 29: Verify every module has types.ts (removed inline interfaces)
Step 30: Typecheck, test, verify
```

---

## 10. Risk Assessment

### High Risk Items

| Risk | Mitigation |
|------|------------|
| **Transaction boundary drift** — Moving `prisma.$transaction` to repository may break atomicity if service mixes calls from multiple repositories | Repository exposes `*InTransaction` variants. Services that need atomicity across entities should use a coordinator pattern or higher-order transaction service. |
| **Message service `editMessage` non-transactional read** — Already a known debt, should be fixed during migration | Move `getMessageById` + validation + update inside `prisma.$transaction` when creating repository. |
| **Socket room join regression** — Moving DM room join from prisma to service may break if service filters differently | Write integration test for socket room join behavior. Maintain backward compatibility: socket should join DM rooms for all existing conversations. |

### Medium Risk Items

| Risk | Mitigation |
|------|------------|
| **Invite resolver transaction client** — Resolvers receive `tx` from `invites.service.ts`. Repositories must expose `*InTransaction` variants. | Test every resolver path after migration. The `invites.service.ts` calls `resolver.resolve({ tx, ... })` — make sure the repository methods accept `tx`. |
| **Channel query ownership** — `workspaces.service.ts` queries `prisma.conversation` for channels. Should this live in conversations.repository or workspaces.repository? | **Decision:** Create `conversations.repository.findChannelByWorkspaceId()` and have workspaces.service import it. This keeps domain ownership clear. |
| **Type drift between schema.ts and types.ts** — Zod-inferred types and domain DTOs may drift if both must be updated separately | Use `types.ts` types in service/repository layers. Use `schema.ts` inferred types only for HTTP input validation in controllers. |

### Low Risk Items

| Risk | Mitigation |
|------|------------|
| **Dead code** — Unused imports may accumulate | Run `npm run lint` after each phase. TypeScript catches unused imports with `noUnusedLocals`. |
| **Testing gaps** — No existing test suite | Run manual verification after each phase. Add integration tests for critical paths (message send, invite resolve). |
| **Renaming fatigue** — Many import paths change at once | Do one module at a time. TypeScript compiler catches missing imports. Re-export from old paths temporarily if needed. |

---

## Summary: What Changes and Why

| Layer | Before | After | Why |
|-------|--------|-------|-----|
| **Types** | Only 1 module has `types.ts` | 7 new `types.ts` files | Decouple domain from Prisma. Clear contracts between layers. |
| **Repository** | Does not exist | 7 new repository files | Enforce strict DB boundary. Repos only place with `prisma.*`. |
| **Services** | Mix business logic + prisma queries | Pure business logic only | Separation of concerns, testability |
| **Socket** | Uses prisma directly | Calls services | Transport-only layer |
| **Auth** | Spread across middleware + shared/permissions | Dedicated auth module | Single authority for access control |
| **Middleware** | Uses prisma directly | Calls auth.service | No DB access in middleware |
| **app.ts** | Inline prisma query | Calls service/repo | Consistency |
| **Invite controller** | Uses `getIO()` raw | Uses dispatcher | Consistency with rest of codebase |

### File Count Summary

| Category | Files Created | Files Modified | Files Deleted |
|----------|--------------|----------------|---------------|
| **Types Files** | 7 (`*.types.ts`) | 3 (`*.schema.ts` — strip domain types) | 0 |
| **Repository Files** | 7 (`*.repository.ts`) | 0 | 0 |
| **Service Files** | 0 | 5 (remove prisma + socket deps) | 0 |
| **Auth Module** | 5 (controller, service, repo, types, routes) | 2 (update middleware + permissions) | 0 |
| **Socket** | 1 (`socket.types.ts`) | 3 (socket.ts, workspace.handler, dispatcher) | 0 |
| **Other** | 0 | 2 (app.ts, invites.controller) | 0 |
| **Total** | **20 new files** | **15 modified files** | **0 deleted** |

---

*Generated 2026-06-12. This document is the source of truth for the architecture restructure.*
