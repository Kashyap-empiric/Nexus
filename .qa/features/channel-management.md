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

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
