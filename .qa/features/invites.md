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

## Agent Self QA
Status: PENDING

## Human QA
Status: PENDING

## Review Status
Status: PENDING
