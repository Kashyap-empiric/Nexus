# Feature: Invites

## Goal

Allow users to generate invite links for workspaces, channels, and conversations; share them; and allow recipients to accept or decline invitations. Support batch invite and email-based invitations.

---

## Current Status

```
Implemented
```

Full invite system with token-based links, public info endpoint, resolution with atomic consumption, socket room joining, notification fan-out, batch invite, and email invites via BullMQ.

---

## High-Level Summary

- Invite types: WORKSPACE, CHANNEL, USER, CONVERSATION — each with its own resolver.
- Tokens are 32-byte random hex strings, consumed atomically via raw SQL to prevent race conditions.
- Invite resolution uses a transaction with pluggable resolvers per invite type.
- Socket rooms are joined dynamically on acceptance (no reconnect needed).
- Invite link generation reuses existing active invites within 24 hours (unless `forceNew`).
- Email invites sent via BullMQ `sendEmail` processor (SendGrid).
- Batch invite enqueues `batch-invite` job for async processing.
- Scheduled cleanup of expired invites runs daily at 3 AM via BullMQ.
- `GET /api/invites/info` is public (no auth required) for link sharing.

---

## Code Locations

```
Backend

server/src/modules/invites/invites.service.ts      — Core invite logic
server/src/modules/invites/invites.controller.ts   — Request handlers
server/src/modules/invites/invites.routes.ts       — Route definitions
server/src/modules/invites/invites.repository.ts   — Database queries
server/src/modules/invites/invites.types.ts        — TypeScript types
server/src/modules/invites/resolvers/index.ts      — Resolver registry
server/src/modules/invites/resolvers/workspaceResolver.ts    — Workspace accept
server/src/modules/invites/resolvers/channelResolver.ts      — Channel accept
server/src/modules/invites/resolvers/userResolver.ts         — User DM accept
server/src/modules/invites/resolvers/conversationResolver.ts — Conversation accept
server/src/jobs/processors/batchInvite.processor.ts  — Batch invite worker
server/src/jobs/processors/revokeInvite.processor.ts  — Revoke invite worker
server/src/jobs/processors/sendEmail.processor.ts     — Email worker
server/src/jobs/processors/cleanup.processor.ts       — Cleanup expired invites

Database

server/prisma/schema.prisma

Frontend

client/src/modules/invites/index.ts                              — Module barrel
client/src/modules/invites/context/InviteModalContext.tsx         — Modal context
client/src/modules/invites/lib/handleInvite.ts                   — Invite handler
client/src/modules/invites/hooks/useInviteModal.ts               — Modal hook
client/src/modules/invites/hooks/useInviteLink.ts                — Link generation hook
client/src/modules/invites/api/invites.api.ts                    — API client
client/src/modules/invites/types/invites.ts                      — Types
client/src/modules/invites/components/InviteModal.tsx            — Invite UI modal
client/src/modules/invites/components/InviteProcessor.tsx        — Landing page
client/src/app/invite/page.tsx                                   — Invite page
```

---

## Database

```prisma
model Invite {
  id         String     @id @default(cuid())
  entityId   String
  token      String     @unique
  createdBy  String
  expiresAt  DateTime?
  maxUses    Int?
  usedCount  Int        @default(0)
  revoked    Boolean    @default(false)
  createdAt  DateTime   @default(now())
  type       InviteType
  lastUsedAt DateTime?
  creator    User       @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([type, entityId])
}

enum InviteType {
  USER
  CONVERSATION
  WORKSPACE
  CHANNEL
}
```

- `token` has a unique constraint.
- Indexed on `type, entityId` for finding all invites for an entity.
- Cascade delete on user deletion.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/invites/generate` | Required | Generate invite token |
| POST | `/api/invites/resolve` | Required | Accept/consume invite token |
| POST | `/api/invites/decline` | Required | Decline invite |
| GET | `/api/invites/info?token=` | Public | Get invite info (no auth) |

### Workspace-specific Endpoints (from workspaces controller)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/workspaces/:id/invite` | Required | Invite user by username/email |
| POST | `/api/workspaces/:id/invite-multiple` | Required | Batch invite by user IDs |
| POST | `/api/workspaces/:id/invite-email` | Required | Invite by email |

### Request Validation

- No Zod schema for `invites.schema.ts` — file does not exist. Validation is done inline in controller.
- `generateInvite`: expects `type` (string) and optional `entityId`.
- `resolveInvite`: expects `token` (string).
- `declineInvite`: expects `token` (string).
- Workspace invite schemas are in `workspaces.schema.ts` with full Zod validation.

### Permissions

- `generateInvite`: USER type (any auth user), WORKSPACE type (ADMIN/OWNER), CONVERSATION type (channel member).
- `resolveInvite`: any authenticated user can accept any invite.
- `GET /api/invites/info`: public (no auth).

---

## Backend Implementation

### Invite Service (`server/src/modules/invites/invites.service.ts`)

- **`generateInviteService()`**:
  - Checks permissions based on invite type.
  - If not `forceNew`, finds existing active invite within 24 hours and returns it.
  - Otherwise revokes old invite and creates new one.
  - Token: 32 random bytes as hex string.
  - Default expiry: 7 days.
- **`resolveInviteService()`**:
  - Runs within a Prisma transaction.
  - Validates invite (exists, not revoked, not expired, max uses not exhausted).
  - Delegates to type-specific resolver.
  - Consumes token atomically via raw SQL (`UPDATE ... SET usedCount = usedCount + 1 WHERE ...`).
  - Updates INVITE_RECEIVED notification to accepted state.
  - Fires domain events (socket dispatches).
  - Enqueues pending notifications via fan-out job.
- **`getInviteInfoService()`**: Fetches invite by token, looks up entity name and inviter info.
- **`revokeInviteByToken()`**: Sets `revoked: true`.

### Invite Resolvers (`server/src/modules/invites/resolvers/`)

- **workspaceResolver**: Adds user as workspace member, joins #general channel, creates MEMBER_JOINED and INVITE_ACCEPTED notifications for admins/inviter.
- **channelResolver**: Adds user as conversation member (handles P2002 for already member).
- **conversationResolver**: Adds user as conversation member, rejects DM invites.
- **userResolver**: Creates or gets DM between inviter and invitee using `createOrGetDM`.

### Invite Controller (`server/src/modules/invites/invites.controller.ts`)

- **resolveInvite**: Calls service, emits domain events (CONVERSATION_UPDATE, CONVERSATION_NEW, WORKSPACE_MEMBER_UPDATE), dynamically joins socket rooms.
- **declineInvite**: Revokes invite, sends INVITE_DECLINED notification to inviter.
- **getInviteInfo**: Returns invite info with entity name, inviter details, validity status.

---

## Frontend Implementation

### InviteProcessor (`client/src/modules/invites/components/InviteProcessor.tsx`)

- Fetches invite info from `GET /api/invites/info?token=`.
- Shows landing page with inviter name, entity name, accept/decline buttons.
- If user not logged in, shows "Log In to Accept" and "Create New Account" links with invite token stored in sessionStorage.
- If invite is invalid/expired/revoked, shows error page with "Go to Homepage" button.

### InviteModal (`client/src/modules/invites/components/InviteModal.tsx`)

- Multi-purpose modal: generates invite link for workspace or channel.
- For WORKSPACE invites: user search dropdown, email invite input, and shareable link.
- User search with debounced query and workspace member filtering.
- Batch invite via `POST /api/workspaces/:id/invite-multiple`.
- Email invite via `POST /api/workspaces/:id/invite-email`.
- Copy-to-clipboard for shareable invite link.
- Shows expiration date.

### useInviteLink (`client/src/modules/invites/hooks/useInviteLink.ts`)

- Generates invite link and tracks loading/error state.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Token-based invite generation | ✅ | `generateInviteService` |
| Atomic token consumption | ✅ | Raw SQL `UPDATE usedCount` |
| Type-specific resolvers | ✅ | workspaceResolver, channelResolver, etc. |
| Socket room joining on accept | ✅ | Dynamic join in controller |
| Invite info (public endpoint) | ✅ | `GET /api/invites/info` |
| Decline invite | ✅ | `declineInvite` controller |
| Batch invite | ✅ | `POST /api/workspaces/:id/invite-multiple` |
| Email invite | ✅ | `inviteByEmail` controller |
| Scheduled invite cleanup | ✅ | BullMQ scheduled job at 3 AM |
| Invite modal UI | ✅ | InviteModal.tsx |
| Invite landing page | ✅ | InviteProcessor.tsx |
| Zod schema for invites | ❌ | `invites.schema.ts` does not exist |
| Native app deep linking | ❌ | HTTP URLs only |
| Invite analytics (click-through) | ❌ | Not tracked |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| ADMIN generates workspace invite | Token created, returned | `generateInviteService` checks ADMIN/OWNER role | ✅ |
| MEMBER generates workspace invite | 403 forbidden | Permission check rejects | ✅ |
| User accepts workspace invite | Added to workspace + #general | workspaceResolver: onboardUserToWorkspaceInTransaction | ✅ |
| User accepts channel invite | Added to channel members | channelResolver: create ConversationMember | ✅ |
| User accepts DM invite | DM created (or existing returned) | userResolver: createOrGetDM | ✅ |
| Accept expired invite | 400 error | `expiresAt < new Date()` check | ✅ |
| Accept revoked invite | 400 error | `revoked` check | ✅ |
| Accept max-uses exhausted invite | 400 error | `maxUses && usedCount >= maxUses` check | ✅ |
| Already-member accepts workspace invite | Redirect, no duplicate join | `alreadyMember: true`, consumed: false | ✅ |
| Already-member accepts channel invite | Redirect, no duplicate | P2002 caught, membershipCreated: false | ✅ |
| Invite link shared with non-user | Login/Register prompt | sessionStorage stores token | ✅ |
| Multiple rapid accepts of same link | Only one succeeds | Atomic SQL `UPDATE ... SET usedCount` | ✅ |
| 24-hour invite reuse | Same link returned if < 24h old | `findExistingActiveInvite` check | ✅ |
| Email invite to non-user | Email sent, invite created | `inviteByEmail` + `send-email` job | ✅ |

---

## Current Flow

```
Generate invite:
  Client → POST /api/invites/generate → generateInviteService
  → Check permissions → Find existing active invite (< 24h) or create new
  → crypto.randomBytes(32) → Prisma create → return { invitePath, token, expiresAt }

Resolve invite:
  Client → POST /api/invites/resolve → resolveInviteService
  → Prisma transaction:
    1. Find invite by token
    2. Validate (not revoked, not expired, not maxed)
    3. Delegate to type-specific resolver
    4. Atomic SQL consumed
  → Update INVITE_RECEIVED notification to accepted
  → Fire domain events (socket dispatches)
  → Dynamically join socket rooms
  → Enqueue pending notifications (MEMBER_JOINED, INVITE_ACCEPTED)
```

---

## Missing Pieces

```
□ Zod validation schema for invites endpoints
□ Native app deep linking for invites
□ Invite analytics (click-through rate tracking)
□ Re-invite notification when existing invite expires
□ Custom invite message
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Concurrent invite consumption | Atomic SQL prevents double-use | ✅ |
| Invite token brute force | 256-bit random token, practically unguessable | ✅ |
| User deleted before accepting invite | Cascade delete removes invite | ✅ |
| Workspace deleted before invite accepted | Invite becomes invalid (no workspace found) | ✅ |
| Email invite to already-registered user | In-app notification sent + email | ✅ |
| Email invite to non-existent email | No user found, email with link sent | ✅ |
| Self-invite | Rejected (cannot invite yourself) | ✅ |
| Invite for deleted conversation | Resolver throws CHANNEL_NOT_FOUND | ✅ |

---

## Known Limitations

- No Zod validation schema file exists for invites (`server/src/modules/invites/invites.schema.ts` does not exist).
- Invite links are HTTP URLs only — no native app deep linking.
- Email delivery depends on configured SendGrid API key.
- Token reuse within 24 hours could be a security concern if token is leaked.
- No rate limiting on invite generation endpoint.
- No way to send invites from the invite page itself — must use modal in workspace.

---

## Files Inspected

```
server/src/modules/invites/invites.service.ts
server/src/modules/invites/invites.controller.ts
server/src/modules/invites/invites.routes.ts
server/src/modules/invites/invites.repository.ts
server/src/modules/invites/invites.types.ts
server/src/modules/invites/resolvers/index.ts
server/src/modules/invites/resolvers/workspaceResolver.ts
server/src/modules/invites/resolvers/channelResolver.ts
server/src/modules/invites/resolvers/userResolver.ts
server/src/modules/invites/resolvers/conversationResolver.ts
server/src/modules/workspaces/workspaces.controller.ts
server/src/jobs/processors/batchInvite.processor.ts
server/src/jobs/processors/revokeInvite.processor.ts
server/src/jobs/processors/sendEmail.processor.ts
server/src/jobs/processors/cleanup.processor.ts
server/prisma/schema.prisma
client/src/modules/invites/components/InviteModal.tsx
client/src/modules/invites/components/InviteProcessor.tsx
client/src/modules/invites/hooks/useInviteLink.ts
client/src/modules/invites/hooks/useInviteModal.ts
client/src/modules/invites/api/invites.api.ts
client/src/modules/invites/types/invites.ts
```
