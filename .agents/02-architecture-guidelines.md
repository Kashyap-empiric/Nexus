# Nexus Architecture & UI Guidelines

These instructions must be followed by all AI agents working on this project.

## 1. Routing & Next.js Patterns
- **Always** use Next.js `useRouter` from `next/navigation` for client-side routing. 
- **Never** use `window.location.href` as it breaks the SPA experience and forces a hard reload.

## 2. Architecture & Backend Sync
- **Do not invent custom sync endpoints.** The project relies on an existing Supabase database trigger in `server/prisma/SUPABASE_QUERIES.sql` to map data from Supabase Auth to the PostgreSQL database used by Prisma.
- **Auth Chain:** The UI form collects `username` -> this is sent to Supabase Auth metadata as `username` -> the database trigger writes it to the Prisma `User.username` field. If metadata is missing, the trigger falls back to the email prefix. **Rely on the trigger.**
- **Current User Route:** Use the existing `GET /api/me` endpoint for server-side current-user reads. Do not create `/api/auth/me` unless the route structure is deliberately refactored.

## 3. UI & Styling (Shadcn UI)
- **Stick strictly to the standard Shadcn UI Zinc theme.** 
- **Do not** over-design or inject custom "premium" vibrant palettes (e.g., bright purples) unless explicitly requested by the user. 
- Prioritize clean, minimal, default component aesthetics.

## 4. Problem Solving Philosophy
- Keep it simple.
- Prioritize the existing established patterns in the workspace over generalized "best practices".
- Read existing `.sql` trigger files and Prisma schemas before assuming backend behavior.


> **Note:** Documentation updated on 2026-06-10 to reflect UI improvements: feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
