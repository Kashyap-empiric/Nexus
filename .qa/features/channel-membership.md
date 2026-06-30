# Feature: Channel Membership

## Goal

Allow workspace members to be added to and removed from channels, with real-time socket updates and appropriate permission enforcement.

---

## Current Status

```
Implemented
```

Full channel member management with add/remove operations, permission checks, socket room management, and notification dispatch.

---

## High-Level Summary

- Channel membership tracked via `ConversationMember` table.
- PUBLIC channels auto-join all workspace members on creation.
- PRIVATE channels require explicit `ConversationMember` row.
- Add/remove members performed via workspace controller endpoints.
- Socket rooms dynamically joined/left on add/remove (no reconnect needed).
- Permission checks: OWNER, ADMIN, or channel creator can manage members.
- Self-removal allowed but blocked if user is the last manager.
- Notifications sent for CHANNEL_MEMBER_ADDED and CHANNEL_MEMBER_REMOVED.

---

## Code Locations

```
Backend

server/src/modules/workspaces/workspaces.service.ts     — addMembersToChannel, removeMemberFromChannel, getChannelMembers
server/src/modules/workspaces/workspaces.controller.ts  — addChannelMembers, removeChannelMember, getChannelMembers
server/src/modules/workspaces/workspaces.repository.ts  — getChannelMembers, addChannelMembers, removeChannelMember
server/src/modules/workspaces/workspaces.schema.ts      — addChannelMembersSchema
server/src/socket/socket.dispatcher.ts                  — dispatchChannelMemberUpdate

Database

server/prisma/schema.prisma

Frontend

client/src/modules/workspaces/components/ManageChannelMembersModal.tsx  — Member management UI
client/src/modules/workspaces/components/MemberListPanel.tsx            — Member list panel
client/src/modules/socket/handlers/workspace.handlers.ts               — Socket handlers
```

---

## Database

```prisma
model ConversationMember {
  id                String       @id @default(cuid())
  conversationId    String
  userId            String
  lastReadMessageId String?
  joinedAt          DateTime     @default(now())
  conversation      Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  lastReadMessage   Message?     @relation("ConversationMemberLastRead", fields: [lastReadMessageId], references: [id])
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId, conversationId])
}
```

- Composite unique constraint `(conversationId, userId)` prevents duplicate members.
- Cascade delete on conversation or user deletion.

---

## API

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/workspaces/:id/channels/:channelId/members` | Required | Add members to channel |
| DELETE | `/api/workspaces/:id/channels/:channelId/members/:userId` | Required | Remove member from channel |
| GET | `/api/workspaces/:id/channels/:channelId/members` | Required | List channel members |

### Request Validation

```typescript
addChannelMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});
```

### Permissions

- Add members: OWNER, ADMIN, or channel creator.
- Remove members: OWNER, ADMIN, or channel creator (and self-removal).
- Cannot remove last manager from channel.
- Only workspace members can be added.

---

## Backend Implementation

### addMembersToChannel (`server/src/modules/workspaces/workspaces.service.ts`)

1. Verifies workspace membership and channel existence.
2. Checks caller has manage permission (`canManageChannel`).
3. Filters target user IDs to only valid workspace members not already in channel.
4. Creates `ConversationMember` rows via `prisma.conversationMember.createMany`.
5. Returns added users with profile info.

### removeMemberFromChannel (`server/src/modules/workspaces/workspaces.service.ts`)

1. Verifies workspace membership and channel existence.
2. Checks caller has manage permission (unless self-removal).
3. Verifies target is a channel member.
4. Last-manager protection: prevents removing the last member with manage permission.
5. Deletes `ConversationMember` row.

### Socket Dispatch (`server/src/socket/socket.dispatcher.ts`)

- `dispatchChannelMemberUpdate()`:
  - ADDED: joins added members' sockets to `conversation:{channelId}` room, broadcasts to channel and individual users.
  - REMOVED: leaves removed member's sockets from room, broadcasts to channel and individual user.

### Notifications

- `CHANNEL_MEMBER_ADDED`: fan-out notification sent to added members.
- `CHANNEL_MEMBER_REMOVED`: notification sent to removed member.

---

## Frontend Implementation

### ManageChannelMembersModal (`client/src/modules/workspaces/components/ManageChannelMembersModal.tsx`)

- Searchable user list of workspace members not already in channel.
- Add members via `POST /api/workspaces/:id/channels/:channelId/members`.
- Remove members via AlertDialog confirmation.
- Real-time updates via socket events.

### MemberListPanel (`client/src/modules/workspaces/components/MemberListPanel.tsx`)

- Displays channel members with status indicators.

---

## Existing vs Missing

| Aspect | Status | Evidence |
|--------|--------|----------|
| Add members to channel | ✅ | `addMembersToChannel` in service |
| Remove members from channel | ✅ | `removeMemberFromChannel` in service |
| List channel members | ✅ | `getChannelMembers` in service |
| Permission enforcement | ✅ | `canManageChannel` check |
| Self-removal | ✅ | `isSelfRemoval` flag |
| Last manager protection | ✅ | Manager count check |
| Socket room join on add | ✅ | `dispatchChannelMemberUpdate("ADDED")` |
| Socket room leave on remove | ✅ | `dispatchChannelMemberUpdate("REMOVED")` |
| Validation (max 50 per batch) | ✅ | Zod schema max 50 |
| Filter non-workspace members | ✅ | `workspaceMemberIds` filter |
| Duplicate prevention | ✅ | Filter existing members + `skipDuplicates` |
| Notification on add | ✅ | CHANNEL_MEMBER_ADDED fan-out |
| Notification on remove | ✅ | CHANNEL_MEMBER_REMOVED dispatch |
| Batch member removal | ❌ | Only one at a time |

---

## Expected Behavior Matrix

| Scenario | Expected Behavior | Current Behavior | Status |
|----------|-------------------|------------------|--------|
| ADMIN adds member to private channel | Member added, socket join, notification | `addMembersToChannel` → channel create → socket join → notification | ✅ |
| ADMIN adds already-member | Silently skipped | `skipDuplicates: true`, filtered | ✅ |
| ADMIN adds non-workspace user | 400 error, not added | Only workspace member IDs used | ✅ |
| ADMIN removes member from channel | Member removed, socket leave, notification | `removeMemberFromChannel` → socket leave → notification | ✅ |
| Member removes self from channel | Removed, socket leave | `isSelfRemoval` in permission check | ✅ |
| Last manager tries to remove self | 403 forbidden | Manager count <= 1 check | ✅ |
| MEMBER tries to add someone | 403 forbidden | `canManageChannel` returns false | ✅ |
| MEMBER tries to remove someone | 403 forbidden | `canManageChannel` returns false | ✅ |
| Get channel members | List returned with user profiles | `getChannelMembers` → `conversationMember.findMany` | ✅ |
| Add 50 members at once | All added | Batch `createMany` | ✅ |
| Add 51 members at once | 400 validation error | Zod max 50 | ✅ |

---

## Current Flow

```
Add members:
  POST /api/workspaces/:id/channels/:channelId/members
  → Validate workspace membership
  → Check canManageChannel permission
  → Filter to valid workspace members not already in channel
  → ConversationMember.createMany (skipDuplicates)
  → dispatchChannelMemberUpdate("ADDED") → socket join + broadcast
  → Fan-out CHANNEL_MEMBER_ADDED notifications
  → Return added users

Remove member:
  DELETE /api/workspaces/:id/channels/:channelId/members/:userId
  → Validate workspace membership
  → Check canManageChannel (or self-removal)
  → Check last manager constraint
  → ConversationMember.delete
  → dispatchChannelMemberUpdate("REMOVED") → socket leave + broadcast
  → Create CHANNEL_MEMBER_REMOVED notification
  → Return removed userId
```

---

## Missing Pieces

```
□ Batch member removal (currently one at a time)
□ Channel member role/permissions (e.g., channel moderator)
□ Mute channel (user-level notification override)
□ Channel invite link for private channels
```

---

## Edge Cases

| Edge Case | Current | Status |
|-----------|---------|--------|
| Remove last manager from channel | Blocked (manager count check) | ✅ |
| Add member who left and rejoined | Works (no unique conflict due to delete) | ✅ |
| Remove member who was never added | 404 "Member not found in this channel" | ✅ |
| Self-removal as only member | Allowed if not a manager | ✅ |
| Add to deleted workspace | 404 workspace not found | ✅ |
| Add to deleted channel | 404 channel not found | ✅ |

---

## Known Limitations

- No batch removal — members must be removed one at a time.
- No channel-specific role/permissions system — only workspace-level roles.
- Add member validation iterates all workspace members — could be slow for 10K+ member workspaces.
- No "mute channel" feature for per-channel notification control.

---

## Files Inspected

```
server/src/modules/workspaces/workspaces.service.ts
server/src/modules/workspaces/workspaces.controller.ts
server/src/modules/workspaces/workspaces.repository.ts
server/src/modules/workspaces/workspaces.schema.ts
server/src/socket/socket.dispatcher.ts
server/prisma/schema.prisma
client/src/modules/workspaces/components/ManageChannelMembersModal.tsx
client/src/modules/workspaces/components/MemberListPanel.tsx
client/src/socket/handlers/workspace.handlers.ts
```
