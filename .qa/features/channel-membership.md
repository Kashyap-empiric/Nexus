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
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] API 404 errors show not found
- [ ] Duplicate member addition rejected gracefully

## Demo Preparation

### Demo Flow
1. Create a public channel — all workspace members auto-joined
2. Create a private channel — only creator initially
3. Add member to private channel via Manage Members modal
4. Remove member from channel
5. Verify non-member cannot access private channel

### Test Accounts
- Workspace ADMIN account
- Workspace MEMBER account (non-admin)
- User not in workspace

### Expected Results
- Public channel auto-joins all workspace members
- Private channel requires explicit member addition
- Non-members blocked from private channel access
- Socket events update member lists in real-time

## Architecture Explanation

### Design Decisions
- Channels reuse Conversation model with `type: CHANNEL` — all message infrastructure shared with DMs
- PUBLIC channels auto-join via bulk ConversationMember insert on creation
- PRIVATE channels require explicit ConversationMember rows

### Data Flow
Client → REST → Controller → Service → Repository → ConversationMember + Socket dispatcher → room join/leave

### API Flow
- `POST /api/workspaces/:id/channels` — create
- `POST .../channels/:channelId/members` — add members
- `DELETE .../channels/:channelId/members/:userId` — remove

### Database Interactions
- `Conversation` with `type: CHANNEL` and `workspaceId` FK
- `ConversationMember` rows for explicit membership (private) or auto-join (public)
- `visibility` field: PUBLIC or PRIVATE

### Permission Model
- Workspace members can access PUBLIC channels
- PRIVATE channels require ConversationMember record
- ADMIN/OWNER can change visibility

### Tradeoffs
- Visibility toggle is one-way PUBLIC→PRIVATE (PRIVATE→PUBLIC requires manual re-add)

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| Visibility toggle not reversible (PRIVATE → PUBLIC) | Would require re-adding all members | 2026-06-12 |

## AI Usage Report

### Scope
Channel membership — public/private channels, auto-join, member management

### Files Modified
- Channel components, modals (client)
- Channel routes, service, repository (server)

### Decisions Made
- PUBLIC auto-join via bulk insert for performance
- Socket room membership synced on add/remove

### Risks
- Visibility toggle is one-way — no migration path for PRIVATE→PUBLIC

### Follow-up Work
- Add PRIVATE→PUBLIC visibility migration with member re-join

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
