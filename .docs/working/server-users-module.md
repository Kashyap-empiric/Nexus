# Server Users Module

**Location:** `server/src/modules/users/`

## Overview

The Users module provides user search functionality and user profile lookup. It is intentionally minimal — user CRUD (creation, avatar management, profile editing) is handled by Supabase Auth; the server only reads user records for search and display purposes.

---

## Files & Functions

### `users.service.ts`
Business logic layer.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `searchUsers` | `(query: string, currentUserId: string) => Promise<UserSearchResult[]>` | Searches users by username or email, excluding the current user | Powers the "New Message" search modal and invite-by-username flow. Excludes current user to prevent self-DM from search. |

### `users.repository.ts`
Data access layer.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `searchUsers` | `(query, currentUserId) => Promise<User[]>` | Prisma query: case-insensitive search on `username` and `email`, limited to 10 results, excludes current user | Efficient database search with insensitive mode |
| `findUserById` | `(id: string) => Promise<User\|null>` | Finds a user by their UUID | Used in `/api/me` endpoint and invite flow to get user details |
| `findUserByUsername` | `(username: string) => Promise<User\|null>` | Case-insensitive lookup by username | Used by the invite-by-username flow in workspaces controller |

### `users.controller.ts`
HTTP request handler.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `searchUsers` | `(req: AuthRequest, res: Response) => Promise<void>` | Handles `GET /api/users/search?q=...` | Extracts query param, calls service, returns JSON response |

### `users.routes.ts`
Route registration.

| Endpoint | Middleware | Handler |
|---|---|---|
| `GET /search` | `authMiddleware`, `validate({ query: searchUsersQuerySchema })` | `searchUsers` |

### `users.schema.ts`
Zod validation schemas.

| Schema | Fields | Purpose |
|---|---|---|
| `searchUsersQuerySchema` | `q: z.string().max(100).optional().default("")` | Validates the search query parameter |

### `users.types.ts`
TypeScript types.

| Type | Fields | Purpose |
|---|---|---|
| `UserSearchResult` | `{ id, username, avatarUrl }` | Return type for user search — limited to public profile data |
| `UserSearchParams` | `{ query, currentUserId }` | Input type for the search service function |

---

## Architecture Decisions

1. **Minimalist read-only module**: Users module does NOT handle registration, login, password changes, or profile updates. These are owned by Supabase Auth. This keeps the surface area small and avoids duplicating auth logic.

2. **Case-insensitive search**: The `mode: "insensitive"` Prisma option enables case-insensitive username/email search, which is critical for a good UX when searching by usernames.

3. **10-result limit**: Search results are capped at 10 to avoid excessive payload sizes and ensure fast responses.
