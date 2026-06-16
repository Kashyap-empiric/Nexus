# Architectural Conflicts Analysis

> Cross-module design contradictions that create friction, bugs, or maintenance overhead.
> Covers both server (`server/src/`) and client (`client/src/`).

---

## 🔴 CRITICAL CONFLICTS

### 1. Transaction Wrapper Design Intent vs Reality

**Files:**
- `server/src/lib/transaction.ts:4-5` — comment states *"This is the only place services interact with prisma directly"*
- All `*/modules/*/*.repository.ts` files — every repository imports `prisma` directly from `@/lib/db.js`
- `server/src/modules/messages/messages.repository.ts:56` — uses `prisma.$transaction([...])` directly (bypassing the wrapper)
- `server/src/modules/workspaces/workspaces.service.ts:3,85` — imports `runTransaction`
- `server/src/modules/messages/messages.service.ts:146` — imports same function as `prismaTransaction`

**The Conflict:** A custom `runTransaction` wrapper exists with the stated purpose of being the sole Prisma interaction point, but **every single repository** bypasses it by importing `prisma` directly. Additionally, the wrapper is imported under two different aliases (`runTransaction` vs `prismaTransaction`), and one repository uses raw `$transaction([...])` instead of the wrapper. The wrapper exists as a comment-validated ideal that no code follows.

**Impact:** No transaction isolation for most write operations. If a controller or service makes two sequential repository calls and the second fails, the first is already committed. The `runTransaction` wrapper exists but is only used in 2 out of 8 modules.

---

### 2. Global Error Handler Is Dead Code for All Controllers

**Files:**
- `server/src/middlewares/errorHandler.ts:7-16` — centralized error handler, reads `err.statusCode`, defaults to 500
- Every `*/modules/*/*.controller.ts` — all controllers use try/catch with res.status().json() directly
- `server/src/middlewares/requireConversationMember.ts:29` — sends `stack` to client: `stack: (error as Error)?.stack`

**The Conflict:** A global Express error handler middleware exists, but **no controller ever calls `next(error)`**. Every controller catches errors and sends HTTP responses directly via `res.status().json()`. The global handler is only reached by middleware chain errors (auth, validate). This means:
- Error formatting logic is duplicated across 30+ controller catch blocks
- The global handler's `err.statusCode` convention is never used by business logic
- `requireConversationMember` **leaks stack traces** to the client, while controllers return generic `"Internal server error"`

---

### 3. String-Matching on Error Messages for Control Flow

**Files:**
- `server/src/modules/messages/messages.controller.ts:66-71` — checks `error.message === "403 Forbidden"`
- `server/src/modules/workspaces/workspaces.controller.ts:31,49,113,137,157,257,331,349,370,413` — checks `error?.message?.startsWith("Forbidden")`
- `server/src/modules/invites/invites.controller.ts:34,70,73,76` — checks for `"INVALID_OR_EXPIRED_INVITE"` etc.
- `server/src/modules/invites/invites.service.ts:47-48` — re-throws based on string match
- `server/src/modules/channels/channel-access.ts:42,74` — throws `new Error("Channel not found")` with no status code

**The Conflict:** Four different string-matching strategies exist across modules for routing errors to HTTP status codes. A refactor that changes an error message (e.g., `"403 Forbidden"` to `"Forbidden: not a member"`) silently breaks error handling in a distant controller. There are no custom error classes, no error codes, and no centralized mapping.

---

### 4. Query Keys Half-Centralized, Half-Hardcoded (Client)

**Files:**
- `client/src/shared/constants/queryKeys.ts` — defines 8 keys
- `client/src/modules/workspaces/hooks/useWorkspaces.ts` — uses `["workspaces"]`, `["workspaces", workspaceId]` (hardcoded)
- `client/src/modules/workspaces/hooks/useWorkspaceChannels.ts` — uses `["workspace-channels", workspaceId]` (hardcoded)
- `client/src/modules/workspaces/hooks/useWorkspaceMembersQuery.ts` — uses `["workspace-members", workspaceId]` (hardcoded)
- `client/src/modules/users/hooks/useProfile.ts` — uses `["users", "me"]`, `["users"]` (hardcoded)
- All `socket/handlers/*.handlers.ts` — use `["workspace-channels"]`, `["workspace-members"]` (hardcoded)
- `client/src/socket/socketProvider.tsx:32-50` — invalidates `["users"]`, `["workspaces"]`, `["conversations"]`

**The Conflict:** Query key definitions are split between a centralized `queryKeys.ts` and hardcoded string literals across ~15 files. The `queryKeys.ts` file claims to be a single source of truth but excludes workspace, workspace-channels, workspace-members, and users keys. Changing any key prefix requires hunting through the codebase. Additionally, React Query's key hierarchy (`["users"]` ≠ `["users", "me"]`) means invalidations can silently miss their targets.

---

### 5. `createMessage` REST Endpoint Is Dead Code — Messages Sent via Socket Only

**Files:**
- `client/src/modules/messages/api/messages.api.ts:16-19` — exports `createMessage` REST function
- `client/src/modules/messages/index.ts:2` — re-exports it
- `client/src/modules/messages/hooks/useMessages.ts:28-43` — `useSendMessageMutation` uses `socket.emit("message:send", ...)` and completely ignores the REST endpoint
- `server/src/modules/messages/messages.controller.ts:24-45` — server-side REST `createMessage` handler exists
- `server/src/modules/messages/messages.routes.ts:20-27` — route registered with validation and rate limiting
- `server/src/socket/handlers/message.handler.ts:50-128` — socket handler for `message:send` also exists

**The Conflict:** Two message creation paths exist on the server (REST + socket), but the client only uses the socket path. The REST endpoint is fully wired with validation, rate limiting, and DB writes — and is completely unreachable from the client. Any developer reading the API module would assume messages can be created via REST. The dual paths also mean:
- Push notifications only fire from the socket handler (`message.handler.ts:88-128`), not from the REST controller
- If a future mobile client uses REST for messages, push notifications will be silently missing

---

### 6. `MessageReadPayload` Type Defined in Two Places With Identical Shapes

**Files:**
- `client/src/socket/socket-events.ts:22-26` — `MessageReadPayload` with `conversationId`, `userId`, `lastReadMessageId`
- `client/src/modules/chat/types/socket.ts:27-31` — identical `MessageReadPayload` with same fields
- `client/src/socket/handlers/conversation.handlers.ts:5` — imports from `@/modules/chat/types/socket`
- `client/src/modules/chat/hooks/useConversationSocket.ts:11` — imports from `@/modules/chat/types/socket`
- `client/src/socket/socket-events.ts` — defines the same type but it's unused

**The Conflict:** The same socket event payload type lives in two files. The socket-events file defines it but it's unused by the actual handlers (they import the duplicate instead). If a new field is added to the server's emit payload, it must be updated in both places or the client silently drops the field.

---

## 🟡 MEDIUM CONFLICTS

### 7. Validation Applied Inconsistently Across Modules

**Files:**
- `server/src/modules/messages/messages.routes.ts` — uses `validate()` middleware on all routes ✅
- `server/src/modules/users/users.routes.ts` — uses `validate()` on all routes ✅
- `server/src/modules/conversations/conversations.routes.ts` — uses `validate()` on POST and PATCH, not on GET ❌
- `server/src/modules/notifications/notifications.routes.ts` — uses `validate()` only on PUT `/preferences`; push routes use manual `.parse()` in controller ❌
- `server/src/modules/workspaces/workspaces.routes.ts` — **ZERO validate middleware on any of 11 routes** ❌
- `server/src/modules/invites/invites.routes.ts` — **ZERO validate middleware** ❌
- `server/src/modules/notifications/notifications.controller.ts:84,112` — manual `schema.parse()` in controller (different pattern)

**Impact:** Workspace creation, channel CRUD, member role management, invite generation, and invite resolution all accept unvalidated user input. The `createWorkspace` controller destructures `name`, `slug`, `imageUrl` from `req.body` with zero guarantees about their shape or content.

---

### 8. `chatStore.activeConversationId` Duplicates URL Params (Client)

**Files:**
- `client/src/modules/chat/store/chatStore.ts:20` — `activeConversationId: string | null`
- `client/src/modules/conversations/components/Sidebar.tsx:56` — reads from both `useChatStore` and `useParams()`
- `client/src/modules/chat/components/ActiveConversation.tsx` — reads from URL params

**The Conflict:** The currently active conversation is tracked in both a Zustand store (`chatStore.activeConversationId`) and the URL path (`/conversations/[id]` or `/workspaces/[wid]/channels/[cid]`). The sidebar reads from Zustand (line 48-49 of Sidebar.tsx) while page components read from URL params. These can diverge if one updates without the other. The Zustand store value is a stale snapshot — if the user navigates via a link rather than clicking in the sidebar, the Zustand value may not update.

---

### 9. Socket Handlers Import `getAuthUser()` — Stale Snapshot (Client)

**Files:**
- `client/src/modules/auth/store/useAuthStore.ts:32` — exports `getAuthUser` (raw Zustand getter, not a hook)
- `client/src/socket/handlers/message.handlers.ts:6,47` — imports `getAuthUser`
- `client/src/socket/handlers/conversation.handlers.ts:6,12` — imports `getAuthUser`
- `client/src/socket/handlers/workspace.handlers.ts:4,53` — imports `getAuthUser`

**The Conflict:** Socket handlers call `getAuthUser()` at handler execution time, getting the user state at that instant. These callbacks live for the lifetime of the socket connection. If the user logs out or their session refreshes, the handlers hold a stale reference to the old user until the next execution. A `getAuthUser()` call in a `MESSAGE_NEW` handler 3 hours after login will still return the original user — even if the user has since logged out and another user logged in on the same tab (edge case, but possible with Supabase magic link flows).

---

### 10. No Module Index for `settings` and `notifications` (Client)

**Files with index.ts:** `auth/`, `chat/`, `conversations/`, `invites/`, `landing/`, `messages/`, `users/`, `workspaces/`
**Files without:** `settings/`, `notifications/`

**The Conflict:** 8 of 10 client modules have barrel exports (`index.ts`), but `settings` and `notifications` don't. This forces consumers to use deep import paths:
```typescript
import { SharedSettingsModal } from "@/modules/settings/components/SharedSettingsModal"
import { BellPopover } from "@/modules/notifications/components/BellPopover"
```
These deep paths are indistinguishable from importing internal module implementation details. There's no way to distinguish the "public API" of these modules from their internal files.

---

### 11. User Data in Two Stores Without Synchronization Contract (Client)

**Files:**
- `client/src/modules/auth/store/useAuthStore.ts` — stores raw Supabase user (`User` object from `supabase.auth.getSession()`)
- `client/src/modules/users/hooks/useProfile.ts` — fetches DB user profile via React Query (`["users", "me"]`)
- `client/src/modules/conversations/components/Sidebar.tsx:352-363` — manually reconciles both sources: `dbProfile?.username || currentAuthUser?.user_metadata?.username`

**The Conflict:** The current user's identity is split across two systems with no synchronization contract:
1. Zustand: raw Supabase `User` object (has `email`, `user_metadata`, but no DB fields like `bio`, `statusText`)
2. React Query: DB profile (has `username`, `fullName`, `bio`, `statusText`, but may be stale or missing)

Components must manually choose which source to use and reconcile differences. The `Sidebar.tsx` fallback chain (`dbProfile?.username || currentAuthUser?.user_metadata?.username`) is ad-hoc reconciliation duplicated across components.

---

### 12. `dispatchNotification` Is Dead Code While Direct `io.emit` Is Used Instead

**Files:**
- `server/src/socket/socket.dispatcher.ts:75-82` — `dispatchNotification` function, exported but never imported
- `server/src/modules/notifications/notifications.service.ts:65-66` — calls `getIO().to(...).emit(...)` directly instead of using `dispatchNotification`
- `server/src/modules/invites/invites.controller.ts:43` — defines its own local `dispatchConversationUpdate` calling `getIO()` directly

**The Conflict:** Three different socket emission patterns coexist:
1. Dispatcher functions (`socket.dispatcher.ts`) — used by controllers and socket handlers
2. Direct `io.emit` in the service layer (`notifications.service.ts`) — bypasses dispatchers entirely
3. Local ad-hoc emit functions (`invites.controller.ts:41-56`) — third pattern in the same app

The dedicated `dispatchNotification` function exists but is unused. Any developer adding a new notification must discover `notifications.service.ts` pattern rather than reusing the dispatcher.

---

### 13. `onlineUsers` in Zustand AND React Query Invalidation — Redundant (Client)

**Files:**
- `client/src/socket/socketStore.ts:14` — `onlineUsers: Set<string>`
- `client/src/socket/socketProvider.tsx:30-36` — on `INITIAL_PRESENCE`, updates `onlineUsers` Set AND invalidates `["users"]`, `["workspaces"]` in React Query

**The Conflict:** Online/offline status is already tracked in-memory via Zustand's `onlineUsers` Set. The additional React Query invalidations trigger network refetches of user lists and workspace data — data that doesn't actually change when a user comes online or goes offline. The invalidation is redundant and wasteful: the status is already available instantly from the Zustand store, but the query cache is still refetched.

---

### 14. Workspace API Routes Hardcoded Instead of Using `API_ROUTES` (Client)

**Files:**
- `client/src/config/url.ts` — defines `API_ROUTES` for conversations, messages, notifications, invites, users, auth
- `client/src/modules/workspaces/api/workspaces.api.ts` — all paths hardcoded: `"/workspaces"`, `` `/workspaces/${workspaceId}/channels` ``
- `client/src/modules/users/hooks/useProfile.ts:24,42` — hardcoded `"/users/me"`

**The Conflict:** The `config/url.ts` file claims (via comment) to be the single source of truth for API route strings, but workspace routes and user profile routes bypass it entirely. Changing any workspace route prefix requires updating all hardcoded strings in `workspaces.api.ts` and any other file that constructs workspace URLs manually.

---

### 15. No Shared Package for Socket Events — Client + Server Maintain Duplicates

**Files:**
- `server/src/shared/socket-events.ts` — socket event constants and payload interfaces
- `client/src/socket/socket-events.ts` — identical copy

**The Conflict:** The same socket event constants are manually duplicated across client and server. Adding a new event requires updating two files in separate directory trees. If a developer updates one but forgets the other, the event silently fails — the server emits a string the client doesn't listen for. This is a well-known anti-pattern that should be solved with a shared package.

---

### 16. No Barrel Exports on Server Modules — Controllers Import Repositories Directly

**Files with index.ts:** Only `server/src/modules/invites/resolvers/index.ts`
**Files without:** All 7 other modules (auth, channels, conversations, messages, notifications, users, workspaces)

**Direct cross-module repository imports:**
- `workspaces.controller.ts:4` — imports `users.repository` directly
- `workspaces.controller.ts:6` — imports `notifications.service` directly
- `conversations.controller.ts:65` — dynamic `import("../messages/messages.service.js")`
- `notifications.controller.ts:130,175` — calls `prisma.user.findUnique` and `prisma.user.update` directly
- `invites.resolvers/workspaceResolver.ts:2` — imports `workspaces.repository` directly

**The Conflict:** Without barrel exports, there's no defined public API for any module. Controllers import repositories directly, bypassing service-layer business logic. The `notifications.controller.ts` bypasses both service and repository by calling `prisma.user.*` directly. The `conversations.controller.ts` dynamic import is a clear symptom of this — the developer couldn't resolve the dependency statically, so they deferred it to runtime.

---

## 🔵 MINOR CONFLICTS

### 17. Rate Limiter Applied Before Auth Middleware

**File:** `server/src/modules/messages/messages.routes.ts:22-26`
```typescript
router.post("/", messageLimiter, authMiddleware, ...);
```

The rate limiter runs before auth. Unauthenticated requests consume rate-limit budget. On GET routes, auth comes first. Inconsistent ordering within the same router.

### 18. `SocketProvider` (Layout-Level) + `useGlobalSocket` (Component-Level) — No Singleton Enforcement

**Files:**
- `client/src/socket/socketProvider.tsx` — renderless component in `(protected)/layout.tsx`
- `client/src/socket/useGlobalSocket.ts` — hook called from `Sidebar.tsx`
- `client/src/socket/useConversationSocket.ts` — hook called from `ActiveConversation.tsx`

If `useGlobalSocket` is accidentally called in two components (e.g., during a refactor), handlers are registered twice. There's no guard to ensure singleton behavior. Compare with the Java/Go approach where such things are enforced at the framework level.

### 19. `proxy.ts` Only Protects `/conversations` Route Server-Side

**File:** `client/src/middleware/proxy.ts:34`
```typescript
const isProtectedRoute = pathname.startsWith(APP_ROUTES.CONVERSATIONS.INDEX);
```

The Next.js middleware only checks auth for `/conversations` paths. Routes like `/workspaces`, `/notifications`, and `/settings` rely entirely on client-side auth gates. If a client-side auth check fails, the user may briefly see protected content before redirect.

### 20. `User` vs `UserResult` — Same Entity, Different Types (Client)

**Files:**
- `client/src/modules/conversations/types/conversation.ts:3-8` — `User` interface (without `email`, `bio`, `status`)
- `client/src/modules/users/api/users.api.ts:4-15` — `UserResult` interface (with `email`, `bio`, `status`)

Components rendering user information must handle both types. The `Sidebar.tsx` uses `as any` casts (line 257: `(otherMember?.user as any)?.avatarPath`) to access fields that exist on one type but not the other.

### 21. Import Extension Inconsistencies (Server)

**Files missing `.js` extension (required by `verbatimModuleSyntax`):**
- `server/src/socket/middlewares/auth.ts:2-3` — `from "@/utils/jwt"`, `from "../socketErrors"`
- `server/src/socket/socket.types.ts:1` — `from "../modules/conversations/conversations.types"`
- `server/src/modules/messages/messages.types.ts:1` — `from "../conversations/conversations.types"`
- `server/src/modules/conversations/conversations.service.ts:1` — `import { uuidv7 } from "uuidv7"` (missing `.js` — OK for npm packages, but the others will fail under strict module resolution modes)

### 22. Module-Level vs Per-Route Auth Middleware

**`router.use(authMiddleware)`:** `workspaces.routes.ts`, `notifications.routes.ts`, `invites.routes.ts` (per-route with `as any`)
**Per-route `authMiddleware`:** `messages.routes.ts`, `conversations.routes.ts`, `users.routes.ts`

Using `router.use()` is DRYer but makes it impossible to exclude specific routes from auth (e.g., public workspace info). Using per-route is explicit but repetitive. The split means someone reading a router must check both patterns.

### 23. `$transaction([array])` in Repository vs `runTransaction(callback)` in Services

**Files:**
- `server/src/modules/messages/messages.repository.ts:56` — `prisma.$transaction([...])` returns `Promise<[Message, Conversation, BatchPayload]>`
- `server/src/modules/workspaces/workspaces.service.ts:85` — `runTransaction(async (tx) => { ... })` passes a transaction client

Both achieve atomicity but with different APIs. The array-style requires manually tracking which result is at which index. The callback-style passes a `tx` client. These are inconsistent and force developers to learn both patterns.
