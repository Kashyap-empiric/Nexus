# Server Users Module

**Location:** `server/src/modules/users/`

## Overview

The Users module provides user search, profile management, and user lookup. Profile editing (username, displayName, avatarUrl) is available via REST API.

---

## Files & Functions

### `users.service.ts`
Business logic layer.

| Function | Signature | Purpose |
|---|---|---|
| `searchUsers` | `(query, currentUserId) => Promise<UserSearchResult[]>` | Searches users by username or email, excluding current user |
| `getMyProfile` | `(userId) => Promise<User>` | Returns full user record with notification preferences |
| `updateProfile` | `(userId, data) => Promise<User>` | Updates username, displayName, avatarUrl, isOnboarded |

### `users.repository.ts`
Data access layer.

| Function | Signature | Purpose |
|---|---|---|
| `searchUsers` | `(query, currentUserId) => Promise<User[]>` | Prisma query: case-insensitive search on `username` and `email`, includes `email` in results, limited to 10 |
| `findUserById` | `(id) => Promise<User\|null>` | Finds a user by UUID |
| `updateUser` | `(id, data) => Promise<User>` | Updates user profile fields |
| `findUserByUsername` | `(username) => Promise<User\|null>` | Case-insensitive lookup by username |
| `findUserByEmail` | `(email) => Promise<User\|null>` | Unique lookup by email (lowercased) |

### `users.controller.ts`
HTTP request handlers.

| Function | Endpoint | Purpose |
|---|---|---|
| `searchUsers` | `GET /api/users/search?q=...` | Searches users, returns with email in results |
| `getMyProfile` | `GET /api/users/me` | Returns full authenticated user profile |
| `updateProfile` | `PATCH /api/users/me` | Updates profile fields with Zod validation |

### `users.routes.ts`
Route registration.

| Endpoint | Middleware | Handler |
|---|---|---|
| `GET /me` | `authMiddleware` | `getMyProfile` |
| `PATCH /me` | `authMiddleware`, `validate({ body: updateProfileSchema })` | `updateProfile` |
| `GET /search` | `authMiddleware`, `validate({ query: searchUsersQuerySchema })` | `searchUsers` |

### `users.schema.ts`
Zod validation schemas.

| Schema | Fields | Purpose |
|---|---|---|
| `searchUsersQuerySchema` | `q: z.string().max(100).default("")` | Validates search query |
| `updateProfileSchema` | `username?, displayName?, avatarUrl?, isOnboarded?` | Validates profile updates |

---

## Architecture Decisions

1. **Profile editing on User model**: Profile fields (displayName, avatarUrl) are stored directly on the `User` model rather than a separate profile table, avoiding 1:1 sync complexity.

2. **Email returned in search**: Email is included in search results (as `email` field) to support email-based invite flows. This is the unique identifier for user lookup.

3. **Notification preferences on User model**: `pushNotificationsEnabled`, `dmNotifications`, `mentionNotifications`, `channelNotifications` are stored directly on `User` to avoid a separate preferences table and enable fast short-circuit checks in push service.

4. **Partial updates**: The `PATCH /users/me` endpoint supports partial updates — only send the fields that changed.
