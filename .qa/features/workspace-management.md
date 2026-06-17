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

## Agent Self QA
Status: PASS

## Human QA
Status: PENDING

## Review Status
Status: READY_FOR_REVIEW
