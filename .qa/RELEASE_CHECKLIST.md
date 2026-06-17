# Release Checklist

> **Purpose:** Pre-release validation that must be completed before any merge to `development` or `main`.

---

## Pre-Release Validation

### Code Quality
- [ ] No console.log statements in production code
- [ ] No TODO or FIXME comments left unresolved
- [ ] All TypeScript files compile without errors (`npm run typecheck`)
- [ ] All tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)

### Database
- [ ] All migrations are applied and tested
- [ ] Migrations are backward-compatible (additive only)
- [ ] Seed script runs without errors

### API
- [ ] All new endpoints return correct status codes
- [ ] All new endpoints have error handling
- [ ] Rate limiting applied where appropriate
- [ ] Socket events use constants (not string literals)

### UI
- [ ] Desktop layout renders correctly
- [ ] Mobile layout renders correctly
- [ ] No console errors in browser
- [ ] Loading, empty, and error states display correctly
- [ ] Dark mode works for all new/changed components

### Security
- [ ] Auth middleware applied to all new protected routes
- [ ] Input validation (Zod) on all new endpoints
- [ ] No sensitive data exposed in API responses
- [ ] Channel/workspace access control verified

### Documentation
- [ ] `.docs/CHANGELOG.md` updated
- [ ] `.docs/PROJECT_CONTEXT.md` updated (if feature status changed)
- [ ] `.docs/API_REFERENCE.md` updated (if endpoints/events changed)
- [ ] `.docs/modules/<affected>.md` updated
- [ ] `.qa/features/<feature>.md` created/updated
- [ ] `.docs/ENVIRONMENT_VARIABLES.md` updated (if vars changed)

---

## Release Sign-Off

| Area | Reviewer | Status |
|------|----------|--------|
| Code Quality | | ✅ / ❌ |
| Database | | ✅ / ❌ |
| API | | ✅ / ❌ |
| UI | | ✅ / ❌ |
| Security | | ✅ / ❌ |
| Documentation | | ✅ / ❌ |

**Release Approved By:** _________________ **Date:** _______________
