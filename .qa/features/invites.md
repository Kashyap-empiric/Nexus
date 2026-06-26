# Feature: Invites

## Positive Tests
- [ ] Can generate invite link for workspace
- [ ] Can generate invite link for DM conversation
- [ ] Invite link shows invite info (workspace name, inviter) when accessed
- [ ] Can resolve/accept invite and join workspace
- [ ] New members auto-joined to #general channel
- [ ] Batch invite multiple users by ID
- [ ] Invite by email sends email via SendGrid
- [ ] Invite by username creates in-app notification
- [ ] Can decline/revoke invite
- [ ] Socket rooms joined after invite acceptance

## Negative Tests
- [ ] Non-admin cannot generate workspace invite links
- [ ] Expired invite returns error
- [ ] Revoked invite returns error
- [ ] Max-uses exhausted invite returns error
- [ ] Cannot invite non-existent user
- [ ] Cannot invite self to workspace
- [ ] Already-member gets appropriate response

## API Verification
- [ ] `POST /api/invites/generate` returns 201 with token
- [ ] `POST /api/invites/resolve` returns 200 with redirectUrl
- [ ] `GET /api/invites/info?token=` returns 200 with invite info
- [ ] `POST /api/invites/decline` returns 200
- [ ] `POST /api/workspaces/:id/invite` returns 200
- [ ] `POST /api/workspaces/:id/invite-multiple` returns 200
- [ ] `POST /api/workspaces/:id/invite-email` returns 200

## Database Verification
- [ ] Invite row created with correct type and entityId
- [ ] Token is unique and securely random
- [ ] usedCount incremented on resolution
- [ ] expiresAt set correctly (default 7 days)
- [ ] Member rows created on workspace invite acceptance
- [ ] ConversationMember rows created on channel/DM invite acceptance

## UI Verification
- [ ] Desktop layout (>=1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Invite modal loads correctly
- [ ] Loading state during invite generation
- [ ] Error state for invalid/expired invites
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] Expired invite token shows clear error
- [ ] Revoked invite shows appropriate message

## Demo Preparation

### Demo Flow
1. Generate an invite link for a workspace
2. Share link with another user
3. Recipient opens link — invite info displayed
4. Recipient accepts invite — joins workspace and #general channel
5. Verify socket rooms joined dynamically
6. Test batch invite by user IDs
7. Test email invite via SendGrid

### Test Accounts
- Workspace OWNER/ADMIN account for generating invites
- New user account (not in workspace) for accepting

### Expected Results
- Invite link generated with unique token
- Recipient information displayed correctly
- Acceptance joins workspace and default channels
- Socket rooms updated without reconnect
- Email invite sent via SendGrid

## Architecture Explanation

### Design Decisions
- Token-based invites with 32-byte random hex (crypto.randomBytes)
- Invite types: WORKSPACE, CHANNEL, USER, CONVERSATION
- Socket room joining on invite acceptance (no manual reconnect needed)
- Atomic token consumption via raw SQL to prevent race conditions

### Data Flow
Client → REST → Controller → Service → Invite token generated/consumed + Socket dispatcher → room join

### API Flow
- `POST /api/invites/generate` — create token
- `GET /api/invites/info?token=` — public invite info
- `POST /api/invites/resolve` — consume token, join entity
- `POST /api/invites/decline` — revoke token

### Database Interactions
- `Invite` table: unique index on `token`, tracked via `usedCount`
- `WorkspaceMember` rows created on workspace invite acceptance
- `ConversationMember` rows created on channel invite acceptance

### Permission Model
- ADMIN/OWNER can generate workspace invites
- MEMBER can generate channel invites (if channel member)
- Public invite info endpoint requires no auth (for link sharing)

### Tradeoffs
- Token-based invites require link sharing — no native app deep linking
- 24-hour token rotation via lastUsedAt tracking

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| No native app deep linking | Invite links are HTTP URLs only | 2026-06-11 |
| Email invite uses SendGrid (requires API key) | Alternative providers not integrated | 2026-06-15 |

## AI Usage Report

### Scope
Invites — link generation, resolution, batch invite, email invite

### Files Modified
- Invite components, lib (client)
- Invite routes, controller, service, resolvers (server)

### Decisions Made
- Token-based over userId-based invites for link shareability
- Atomic consumption via raw SQL to prevent race conditions

### Risks
- Token replay if not consumed atomically
- SendGrid dependency for email invites

### Follow-up Work
- Add native app deep linking for invites
- Add invite analytics (click-through rate)

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
