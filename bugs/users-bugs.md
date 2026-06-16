# Users Module Bug Analysis

Covers server (`server/src/modules/users/`) and client (`client/src/modules/users/`).

---

## MEDIUM BUGS

### 1. `searchUsers` Leaks Email Addresses

**File:** `server/src/modules/users/users.repository.ts:18-24`

```typescript
select: {
  id: true,
  username: true,
  fullName: true,
  email: true,        // ← email exposed in search results
  avatarUrl: true,
  avatarPath: true,
},
```

The user search endpoint returns `email` for every matched user. This means any authenticated user can enumerate email addresses via `GET /users/search?q=partial_name`. Email is a sensitive field — users may expect it to be private. Even though `take: 10` limits results, a patient attacker can extract emails for all users by iterating search queries.

### 2. No Rate Limiting on User Search

**File:** `server/src/modules/users/users.routes.ts:14-19`

`GET /users/search` has no rate limiter. Combined with Bug 1 (email leak), an attacker can rapidly enumerate users and their email addresses. This is a data scraping vulnerability.

### 3. `updateProfile` Relies on Prisma Error for Duplicate Username

**File:** `server/src/modules/users/users.controller.ts:41-45`

```typescript
catch (error: any) {
  if (error?.code === "P2002") {
    res.status(409).json({ error: "Username already taken" });
```

The controller catches `P2002` (unique constraint) errors to return a friendly message. But:
- This tries the update first, then catches the error. It's an optimistic approach that generates a wasted DB query on conflict.
- If the `User` model has other unique fields (like `email` or `supabaseUserId`), a `P2002` error from those fields is *also* caught and reported as "Username already taken" — a misleading error message.
- The rollback of partial updates is not handled (though `update` is atomic for a single field).

### 4. `getPublicProfile` Route Has No Input Validation

**File:** `server/src/modules/users/users.routes.ts:21`

```typescript
router.get("/:id", authMiddleware, getPublicProfile);
```

The `:id` param is not validated with Zod. Any string is accepted. If an invalid UUID or non-existent ID is passed, Prisma returns `null` and the controller returns a 404. This is correct but inconsistent — other routes use `validate()` middleware for param validation.

### 5. `updateAvatar` Security Check Is Weak

**File:** `server/src/modules/users/users.controller.ts:68`

```typescript
if (avatarPath && !avatarPath.startsWith(`${userId}/`)) {
  res.status(403).json({ error: "Forbidden avatar path" });
  return;
}
```

This check ensures the avatar path starts with `<userId>/` but:
- If `userId` is `abc`, a path like `abc/../../etc/passwd` bypasses the check due to the prefix match
- The check happens before updating the DB, but the path resolution depends on how the file is served
- The `updateAvatarSchema` has an additional `refine` that blocks `..` — this provides defense-in-depth, but the controller's check is still weaker than it appears

### 6. `PublicProfile` Exposes `avatarPath`

**File:** `server/src/modules/users/users.repository.ts:44`

```typescript
select: {
  avatarUrl: true,
  avatarPath: true,   // ← internal path exposed
```

`avatarPath` is a server-side file path that should not be exposed to other users. The `avatarUrl` (full URL) is the public-facing field. Exposing `avatarPath` reveals the server's file storage structure.

---

## MINOR BUGS

### 7. `updateProfile` Accepts Arbitrary Fields via `req.body`

**File:** `server/src/modules/users/users.controller.ts:34`

```typescript
const data = req.body;
```

The `validate` middleware with `updateProfileSchema` filters this, but in the controller body, `data` is typed loosely. If the middleware is bypassed or misconfigured, arbitrary fields could be passed to `prisma.user.update`.

### 8. `updateStatus` Doesn't Validate `statusText` Max Length in Controller

**File:** `server/src/modules/users/users.controller.ts:90`

The `updateStatusSchema` limits `statusText` to 100 chars, but if the validate middleware is ever skipped, the controller passes it directly to Prisma. Defense-in-depth would add a manual check.

### 9. No `console.log` Cleanup in Controller

**File:** `server/src/modules/users/users.controller.ts`

All error handlers use `console.error` which is expected. But there's no structured logging — errors are mixed with other console output.

### 10. `findUserByEmail` Normalizes Email to Lowercase

**File:** `server/src/modules/users/users.repository.ts:79`

```typescript
where: { email: email.toLowerCase() },
```

This is correct for case-insensitive email matching, but:
- The email format `user@example.com` and `User@Example.com` should match
- The Prisma schema may have `@unique` on `email` without a case-insensitive collation
- If two users register with `User@A.com` and `user@A.com`, the second one would fail with a unique constraint violation, but the error message wouldn't explain the case conflict

### 11. `searchUsers` Doesn't Exclude Deleted Users

**File:** `server/src/modules/users/users.repository.ts:3-28`

The search query doesn't check for `deletedAt` or any user status. If the app supports soft-deleting users, they would still appear in search results.
