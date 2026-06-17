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

## Agent Self QA
Status: PASS | FAIL

## Human QA
Status: PENDING | PASS | FAIL

## Review Status
Status: READY_FOR_REVIEW | CHANGES_REQUESTED | APPROVED
```
