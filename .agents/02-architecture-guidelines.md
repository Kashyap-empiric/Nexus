# Nexus Architecture & UI Guidelines

These instructions must be followed by all AI agents working on this project.

## 1. Routing & Next.js Patterns
- **Always** use Next.js `useRouter` from `next/navigation` for client-side routing. 
- **Never** use `window.location.href` as it breaks the SPA experience and forces a hard reload.
- **Workspace routes** follow the pattern `/workspaces/{slug}/channels/{channelId}`.
- **DM routes** follow the pattern `/conversations/{id}`.
- Use `useChatStore` to determine the current mode (`DM` vs `WORKSPACE`) and `activeWorkspaceId`.

## 2. Architecture & Backend Sync
- **Do not invent custom sync endpoints.** The project relies on an existing Supabase database trigger in `server/prisma/SUPABASE_QUERIES.sql` to map data from Supabase Auth to the PostgreSQL database used by Prisma.
- **Auth Chain:** The UI form collects `username` -> this is sent to Supabase Auth metadata as `username` -> the database trigger writes it to the Prisma `User.username` field. If metadata is missing, the trigger falls back to the email prefix. **Rely on the trigger.**
- **Current User Route:** Use the existing `GET /api/me` endpoint for server-side current-user reads. Do not create `/api/auth/me` unless the route structure is deliberately refactored.
- **Workspace ID resolution:** Workspace routes accept either a UUID or a slug. Use `findWorkspaceByIdOrSlug()` on the server side. On the client, the `activeWorkspaceId` in the store may be a slug or ID — always pass it through to the API and let the server resolve it.

## 3. UI & Styling (Shadcn UI)
- **Stick strictly to the standard Shadcn UI Zinc theme.** 
- **Do not** over-design or inject custom "premium" vibrant palettes (e.g., bright purples) unless explicitly requested by the user. 
- Prioritize clean, minimal, default component aesthetics.

## 4. Module Structure
- Feature modules live in `client/src/modules/<name>/` and mirror server modules in `server/src/modules/<name>/`.
- Current modules: `auth`, `workspaces`, `invites`, `conversations`, `messages`, `chat`, `users`, `landing`.
- The `chat` module is the orchestrator — it contains `ActiveConversation`, `NavigationRail`, `PresenceIndicator`, the chat store, and socket hooks.
- Socket infrastructure is in `client/src/socket/` (not in modules).

## 5. Problem Solving Philosophy
- Keep it simple.
- Prioritize the existing established patterns in the workspace over generalized "best practices".
- Read existing `.sql` trigger files and Prisma schemas before assuming backend behavior.
