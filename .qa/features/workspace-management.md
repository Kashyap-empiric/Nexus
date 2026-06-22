# Feature: Workspace Management

## Positive Tests
- [ ] Can create a workspace
- [ ] Workspace appears in NavigationRail
- [ ] Can switch between DM and WORKSPACE mode
- [ ] Workspace routing works: `/workspaces/{slug}/channels/{id}`
- [ ] Can view workspace members list
- [ ] Can change member roles (OWNER → ADMIN, ADMIN → MEMBER)
- [ ] Can remove member from workspace

## Negative Tests
- [ ] Cannot create workspace with empty name
- [ ] Cannot create workspace with duplicate slug
- [ ] MEMBER cannot change roles
- [ ] MEMBER cannot remove members
- [ ] ADMIN cannot change OWNER's role
- [ ] Cannot access workspace without membership

## API Verification
- [ ] `POST /api/workspaces` returns 201 with workspace
- [ ] `GET /api/workspaces/:id` returns 200 with members + channels
- [ ] `GET /api/workspaces/:id/members` returns 200
- [ ] `PATCH /api/workspaces/:id/members/:userId/role` returns 200
- [ ] `DELETE /api/workspaces/:id/members/:userId` returns 200

## Database Verification
- [ ] Workspace row created
- [ ] Creator added as WorkspaceMember with OWNER role
- [ ] #general channel auto-created
- [ ] Member removal cascades correctly

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state (skeleton for member list)
- [ ] Empty state (no channels)
- [ ] Error state
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied
- [ ] API 404 errors show not found
- [ ] Role change errors show appropriate message

## Demo Preparation

### Demo Flow
1. Create a workspace — #general channel auto-created
2. Switch between DM and workspace mode
3. View members list
4. Promote a member to ADMIN
5. Demote an ADMIN to MEMBER
6. Remove a member from workspace

### Test Accounts
- Workspace OWNER account
- Workspace MEMBER account
- Workspace ADMIN account

### Expected Results
- Workspace creation creates slug, #general channel
- Role changes update permissions immediately
- Removed member loses workspace access

## Architecture Explanation

### Design Decisions
- Channels modeled as Conversations with `type: CHANNEL` — reuses all message infrastructure
- Workspace resolution accepts UUID or slug via `findWorkspaceByIdOrSlug`
- OWNER cannot change own role — prevents orphaned workspaces

### Data Flow
Client → REST API → Controller → Service → Repository → Prisma → PostgreSQL + Socket dispatcher

### API Flow
- `POST /api/workspaces` — create
- `PATCH /api/workspaces/:id/members/:userId/role` — role change
- `DELETE /api/workspaces/:id/members/:userId` — remove member

### Database Interactions
- `Workspace`, `WorkspaceMember` tables
- Composite PK `@@id([workspaceId, userId])` on WorkspaceMember
- Cascade delete on workspace removal

### Permission Model
- OWNER: full control
- ADMIN: channel management, member management (except admins)
- MEMBER: send messages, create channels, invite

### Tradeoffs
- In-memory rate limiter prevents multi-instance deployment
- Channel list uses 5s polling instead of socket events

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| Channel list uses 5s polling | Should use socket events like rest of infra | 2026-06-12 |
| Workspace deletion not undoable | Cascade delete by design | 2026-06-12 |

## AI Usage Report

### Scope
Workspace management — CRUD, roles, members

### Files Modified
- Workspace components, hooks, types (client)
- Workspace routes, controller, service, repository (server)

### Decisions Made
- Slug-based routing for human-readable URLs
- Role hierarchy enforced at service layer

### Risks
- No soft-delete for workspaces — cascade delete is permanent

### Follow-up Work
- Replace polling with socket events for channel list
- Add workspace transfer of ownership

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
