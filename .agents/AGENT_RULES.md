# AGENT_RULES — Coding & Architecture Standards

> **Mandatory:** All AI agents operating in the Nexus repository must comply with these rules.
> Violations will introduce technical debt and must be rejected during code review.

---

## 1. Coding Standards

### TypeScript & General
- Use strict TypeScript — no `as any` casts unless the value can genuinely be any type.
- Prefer `const` over `let` and `function` declarations over `const fn = () => {}` for top-level functions.
- Use descriptive variable names — avoid single-letter names outside of loops.
- All files must end with a newline.

### REST APIs
- Extract data from wrappers correctly: `const { data } = await api.get()`.
- If the backend returns `{ data: T }`, handle the wrapper properly in the frontend API client so components receive clean types.
- Always validate request bodies with Zod schemas on the server side.

### Frontend (Next.js / React)
- Keep App Router layout/page files to an absolute bare minimum. Extract all meaningful logic and UI states into dedicated components in `modules/<name>/components/`.
- Do NOT use `flex-col-reverse` for chat interfaces. Parse arrays chronologically and use `scrollIntoView`.
- Prefer TanStack Query for server state. Do not use `useEffect` for data fetching.
- Use `useChatStore` from Zustand for local UI state (mode, active workspace, drafts).

### Backend (Express)
- All database reads required to execute an update or delete MUST occur inside `prisma.$transaction(async (tx) => { ... })`.
- Use the existing `findWorkspaceByIdOrSlug()` for workspace resolution — accept either UUID or slug.
- Generate UUIDv7 IDs in the application layer using the `uuidv7` package. Do not use `crypto.randomUUID()` or Prisma default `@default(uuid())`.

### Database
- Respect soft deletes — any Prisma `findMany` query on entities with `deletedAt` MUST include `where: { deletedAt: null }`.
- Cursor pagination must strictly order by `id: "desc"`, not `createdAt`.

---

## 2. Architecture Standards

### Module Structure
- Feature modules live in `client/src/modules/<name>/` and mirror `server/src/modules/<name>/`.
- Current modules: `auth`, `workspaces`, `invites`, `conversations`, `messages`, `chat`, `users`, `notifications`, `settings`, `landing`.
- The `chat` module is the orchestrator — it contains `ActiveConversation`, `NavigationRail`, `PresenceIndicator`, the chat store, and socket hooks.
- Socket infrastructure lives in `client/src/socket/` (not in modules).

### Routing
- Use Next.js `useRouter` from `next/navigation` for client-side routing. Never use `window.location.href`.
- Workspace routes: `/workspaces/{slug}/channels/{channelId}`
- DM routes: `/conversations/{id}`
- Use `useChatStore` to determine the current mode (`DM` vs `WORKSPACE`) and `activeWorkspaceId`.

### Real-Time (Socket.io)
- All socket emissions must go through `socket.dispatcher.ts` typed helpers — never import `socket.io` in controllers.
- Use `SOCKET_EVENTS` constants from `shared/socket-events.ts` — never emit raw string literals.
- The server is strictly responsible for emitting `CONVERSATION_UPDATE` when metadata changes.

### Auth
- Auth chain: Supabase Auth → JWT → Express middleware verifies via local JWKS → Prisma User (synced via database trigger).
- Do NOT create custom sync endpoints. The Supabase trigger in `SUPABASE_QUERIES.sql` is the source of truth.
- Use the existing `GET /api/me` for current-user reads. Do not create `/api/auth/me`.

---

## 3. Review Requirements

### Mandatory Review Gates
- **Every feature implementation** must be reviewed by a peer (human or AI).
- **Every schema change** must be reviewed for backward compatibility (no destructive migrations).
- **Every new socket event** must verify the event is documented in `.docs/API_REFERENCE.md`.
- **Every new API endpoint** must verify it is documented in `.docs/API_REFERENCE.md`.

### Review Checklist
- [ ] No `as any` casts introduced
- [ ] Soft deletes respected (`deletedAt: null` filter)
- [ ] Transactions used for multi-step DB operations
- [ ] UUIDv7 used for new IDs
- [ ] Socket events use constants, not literals
- [ ] No controller-level socket emissions (use dispatcher)
- [ ] Environment variables centralized in `config/env.ts`

### Performance Review Requirements
- [ ] Heavy components (emoji picker, markdown, modals) use `dynamic(() => import(...))` — not eagerly imported
- [ ] React.memo applied to list items that render frequently (MessageGroupItem, sidebar items, channel items)
- [ ] Socket event handlers use targeted `setQueryData` instead of broad `invalidateQueries` for status/presence updates
- [ ] `staleTime` configured appropriately for infrequently changing data (workspaces: 60s, user profiles: 30s)
- [ ] No blocking `await` on best-effort operations (push notifications, non-critical side-effects)
- [ ] Queries use `select` (not `include`) to fetch only needed fields from Prisma
- [ ] N+1 query patterns avoided — batch DB queries with `in` clauses where possible
- [ ] Typing indicators debounced on client (not every keystroke)
- [ ] Console.log statements removed from production request paths (keep meaningful error logging)

---

## 4. File Organization Rules

- One component per file. Named exports preferred.
- Test files co-located with implementation: `ComponentName.test.tsx`.
- Module structure: `components/`, `hooks/`, `api/`, `types/`, `store/` within each module.
- Shared UI primitives in `shared/components/ui/`.
- Configuration files in `config/` (both client and server).

---

## 5. Migration Rules

- All migrations must be **purely additive**: `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX` — no destructive operations.
- Use `@@unique([field1, field2])` instead of composite `@@id` when backward compatibility is required.
- Use `IF NOT EXISTS` and PL/pgSQL `DO $$ ... EXCEPTION` blocks for idempotent SQL.
- Test migrations against a staging database before deploying to production.

---

## 6. Security Requirements

- **Channel access control**: Private channels require explicit `ConversationMember` records. Workspace members can access non-private channels via `checkConversationAccess`.
- **Workspace roles**: OWNER and ADMIN can manage members and channels. MEMBER has read/write access to public channels.
- **Rate limiting**: Apply `generalLimiter` and `messageLimiter` to all API routes.
- **Push subscriptions**: Prevent subscription hijacking via `deleteMany` before reassignment.
- **Invite tokens**: 24-hour active rotation policy. Atomic consumption via raw SQL.
- **Input validation**: All user input must pass through Zod schemas before reaching service layer.
