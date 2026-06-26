# Feature: Channel Management (Members)

## Positive Tests
- [ ] Can add workspace members to a channel
- [ ] Can remove members from a channel
- [ ] Channel creator can manage members
- [ ] Workspace ADMIN can manage members
- [ ] Adding non-member workspace users works
- [ ] Removal of self from channel works
- [ ] Manage Channel Members modal shows searchable user list
- [ ] AlertDialog confirmation shows before member removal
- [ ] Socket events update member lists in real-time

## Negative Tests
- [ ] MEMBER role cannot manage channel members
- [ ] Cannot add non-workspace users to channel
- [ ] Cannot add duplicate member
- [ ] Cannot remove the last manager (if enforced)
- [ ] Cannot remove user from #general channel (if enforced)

## API Verification
- [ ] `POST /api/workspaces/:id/channels/:channelId/members` returns 201
- [ ] `DELETE /api/workspaces/:id/channels/:channelId/members/:userId` returns 200
- [ ] `GET /api/workspaces/:id/channels/:channelId/members` returns 200
- [ ] 403 for unauthorized access
- [ ] 400 for invalid userIds

## Database Verification
- [ ] ConversationMember rows created correctly
- [ ] ConversationMember rows deleted correctly
- [ ] No orphaned data on member removal

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Manage Members modal opens/closes correctly
- [ ] Search filters user list
- [ ] Loading state
- [ ] Empty state (no members to add)
- [ ] Error state
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] API 404 errors show not found
- [ ] AlertDialog confirmation shows before member removal

## Demo Preparation

### Demo Flow
1. Open Manage Members modal for a channel
2. Search for a workspace member
3. Add member to channel — list updates
4. Remove member — AlertDialog confirmation
5. Verify socket event updates other clients

### Test Accounts
- ADMIN or OWNER account for managing members
- MEMBER account that cannot manage

### Expected Results
- Members added appear in real-time
- Members removed lose channel access
- Non-admins cannot access member management

## Architecture Explanation

### Design Decisions
- Channel membership tracked via ConversationMember table
- Socket room membership updated dynamically on add/remove (no reconnect needed)
- AlertDialog used for destructive actions (replaced window.confirm)

### Data Flow
Client → REST API → Controller → Service → Repository → ConversationMember table + Socket dispatcher broadcast

### API Flow
- `POST .../channels/:channelId/members` — add members
- `DELETE .../channels/:channelId/members/:userId` — remove member

### Database Interactions
- `ConversationMember` rows created/deleted
- Private channel access controlled by membership

### Permission Model
- ADMIN/OWNER can manage channel members
- MEMBER cannot manage members
- Channel creator retains access after removal

### Tradeoffs
- No batch remove — removes one member at a time
- No transfer of ownership for channels

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No batch member removal | Single user at a time via modal | 2026-06-19 |

## AI Usage Report

### Scope
Channel member management — add, remove, permission enforcement

### Files Modified
- ManageChannelMembersModal (client)
- Channel member routes and service (server)

### Decisions Made
- Socket rooms joined dynamically on invite acceptance
- AlertDialog replaces window.confirm for consistency

### Risks
- Removing self from channel may lose access permanently

### Follow-up Work
- Add batch member add/remove
- Add channel ownership transfer

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
