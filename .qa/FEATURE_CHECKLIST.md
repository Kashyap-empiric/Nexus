# Feature QA Checklist — Template

> **Purpose:** Template for creating per-feature QA checklists.
> Copy this file to `.qa/features/<feature-name>.md` and fill in the test cases.

---

```markdown
# Feature: <Feature Name>

## Positive Tests
- [ ] Can <action>
- [ ] Can <action>
- [ ] <Edge case> handled correctly

## Negative Tests
- [ ] <Unauthorized action> rejected
- [ ] <Invalid input> handled gracefully
- [ ] <Edge case> handled correctly

## API Verification
- [ ] Correct status codes returned (200, 201, 400, 403, 404, 500)
- [ ] Correct error responses for failure cases
- [ ] Rate limiting applied where required

## Database Verification
- [ ] Rows created correctly
- [ ] Rows updated correctly
- [ ] Rows deleted/soft-deleted correctly
- [ ] No orphaned data
- [ ] Migrations are backward-compatible

## UI Verification
- [ ] Desktop layout (≥1024px)
- [ ] Tablet layout (768-1023px)
- [ ] Mobile layout (<768px)
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Dark mode
- [ ] No browser console errors (check DevTools console)

## Error Verification
- [ ] API 400 errors show user-friendly message
- [ ] API 403 errors show permission denied message
- [ ] API 404 errors show not found message
- [ ] API 500 errors show generic error (no stack trace leaked)
- [ ] Network failures handled gracefully (timeout, offline)
- [ ] Rate limit responses show retry-after information

## Performance Verification
- [ ] Bundle size: Check for any new heavy imports (emoji picker, markdown, etc.) — use dynamic imports if needed
- [ ] Rendering: Verify list items don't re-render unnecessarily (check React.memo usage)
- [ ] Network: Verify socket events use targeted cache updates, not broad invalidations
- [ ] Database: Verify Prisma queries use `select` (not `include`) and have proper indexes
- [ ] N+1: Verify no N+1 query patterns in service/repository layer
- [ ] Stale time: Verify appropriate `staleTime` configured for infrequently changing data
- [ ] Console: Verify no debug console.log in production request paths
- [ ] Bundle analyzer: Run `ANALYZE=true npm run build` for client to verify bundle impact

## Agent Self QA
Status: PASS | FAIL

## Human QA
Status: PENDING | PASS | FAIL

## Demo Preparation

### Demo Flow
1. <Step-by-step demonstration scenario>
2. <Expected outcome>

### Test Accounts
- <Required accounts, permissions, setup>

### Expected Results
- <Expected outcome for each demo step>

## Architecture Explanation

### Design Decisions
- <Key architectural choices>

### Data Flow
- <Client → API → Server → DB → Socket → Client>

### API Flow
- <Endpoints used>

### Database Interactions
- <Tables affected, key queries>

### Permission Model
- <Who can do what>

### Tradeoffs
- <What was traded off and why>

## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| <Issue> | <Why deferred> | <Date> |

## AI Usage Report

### Scope
- <What was implemented>

### Files Modified
- <List of affected files>

### Decisions Made
- <Important implementation decisions>

### Risks
- <Potential concerns or technical debt>

### Follow-up Work
- <Future improvements or recommended next steps>

## Agent Self QA
Status: PASS | FAIL

## Human QA
Status: PENDING | PASS | FAIL

## Review Status
Status: READY_FOR_REVIEW | CHANGES_REQUESTED | APPROVED
```
