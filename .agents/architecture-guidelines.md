# Nexus Architecture & UI Guidelines

These instructions must be followed by all AI agents working on this project.

## 1. Routing & Next.js Patterns
- **Always** use Next.js `useRouter` from `next/navigation` for client-side routing. 
- **Never** use `window.location.href` as it breaks the SPA experience and forces a hard reload.

## 2. Architecture & Backend Sync
- **Do not invent custom sync endpoints.** The project relies on elegant, existing Supabase database triggers to map data from Supabase Auth to the PostgreSQL database (Prisma).
- **Auth Chain:** The UI form collects `username` -> this is sent to Supabase Auth metadata as `full_name` -> the database trigger automatically extracts `full_name` and writes it to the Prisma `User.name` field. **Rely on the trigger.**

## 3. UI & Styling (Shadcn UI)
- **Stick strictly to the standard Shadcn UI Zinc theme.** 
- **Do not** over-design or inject custom "premium" vibrant palettes (e.g., bright purples) unless explicitly requested by the user. 
- Prioritize clean, minimal, default component aesthetics.

## 4. Problem Solving Philosophy
- Keep it simple.
- Prioritize the existing established patterns in the workspace over generalized "best practices".
- Read existing `.sql` trigger files and Prisma schemas before assuming backend behavior.
