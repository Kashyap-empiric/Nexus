# Feature: Channel Membership

## Positive Tests
- [ ] Can create public channel (all workspace members auto-joined)
- [ ] Can create private channel (only creator initially)
- [ ] Can add member to channel via Manage Members modal
- [ ] Can remove member from channel
- [ ] Creator remains member
- [ ] Members list updates in real-time (socket)

## Negative Tests
- [ ] Non-admin cannot add members
- [ ] Non-member cannot access private channel
- [ ] Cannot add duplicate member
- [ ] Cannot remove the last admin/owner from channel (if enforced)
- [ ] Regular member cannot delete channel

## API Verification
- [ ] `POST /api/workspaces/:id/channels/:channelId/members` returns 201
- [ ] `DELETE /api/workspaces/:id/channels/:channelId/members/:userId` returns 200
- [ ] `GET /api/workspaces/:id/channels/:channelId/members` returns 200
- [ ] 403 returned for unauthorized access

## Database Verification
- [ ] ConversationMember rows created for added members
- [ ] ConversationMember rows deleted for removed members
- [ ] Auto-join creates rows for all workspace members on public channel creation

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Manage Members modal renders correctly
- [ ] Member list updates without refresh
- [ ] Dark mode

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
