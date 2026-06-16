# Channels Module Bug Analysis

Covers server (`server/src/modules/channels/channel-access.ts`) — the channel access verification layer.

---

## MEDIUM BUGS

### 1. `verifyChannelAccess` Duplicates Logic From `auth.repository.checkConversationAccess`

**File:** `server/src/modules/channels/channel-access.ts:24-83` · `server/src/modules/auth/auth.repository.ts:14-44`

Both functions implement nearly identical access control logic:
- Check if channel exists
- If DM/PRIVATE → check ConversationMember
- If PUBLIC CHANNEL → check WorkspaceMember

But they have slightly different error handling:
- `channel-access.ts` throws descriptive errors (`"Channel not found"`, `"Forbidden: ..."`)
- `auth.repository.ts` returns `boolean` (false for not found, false for denied)

This divergence means:
- New access rules must be updated in two places
- Bug fixes in one may not be ported to the other
- Consumers get inconsistent responses (some get Errors, some get booleans)

### 2. `verifyChannelAccess` Throws Errors Instead of Returning Structured Results

**File:** `server/src/modules/channels/channel-access.ts:42,74`

The function throws `Error` objects with string messages for all failure cases. Callers must parse `error.message` to distinguish cases:
- `"Channel not found"` → 404
- `"Forbidden: ..."` → 403
- `"Unknown conversation type"` → 400

This forces string-matching on error messages, which is fragile. Compare with `auth.repository.ts` which returns structured booleans.

### 3. No Caching on Channel Access Checks

Every socket event and HTTP request that triggers a channel access check performs at minimum 2 queries (channel lookup + membership check). For high-volume operations like typing indicators or message reads, this adds significant DB load.

### 4. `verifyWorkspaceMember` Re-Queries What Was Already Loaded

**File:** `server/src/modules/channels/channel-access.ts:90-101`

If `verifyChannelAccess` already loaded the conversation (which includes `workspaceId`), calling `verifyWorkspaceMember` immediately after starts a redundant Prisma query. The workspace membership could be checked from the already-loaded data.

---

## MINOR BUGS

### 5. `verifyChannelAccess` Doesn't Check `deletedAt`

Like `auth.repository.checkConversationAccess`, this function doesn't filter out soft-deleted conversations. A deleted conversation would hit the "Channel not found" path (since `findUnique` returns null for deleted records if the schema filters them), but only if the Prisma schema has a `@@where` clause. If not, deleted conversations are still "found".

### 6. Module Only Has One File — Likely Incomplete

The channels module contains only `channel-access.ts`. There are no channel management endpoints in this module — channel CRUD lives in the `workspaces` module instead (as sub-routes). This means channel-related code is split across two modules, making it harder to maintain.

### 7. Type `ChannelType` Duplicates Prisma's Own Type

**File:** `server/src/modules/channels/channel-access.ts:4`

```typescript
export type ChannelType = "DM" | "CHANNEL";
```

This duplicates the Prisma-generated `ConversationType` enum. If a new type is added to the schema, this type must be manually updated.
