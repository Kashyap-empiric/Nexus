# QA_POLICY — Quality Assurance Standards

> **Mandatory:** Every feature must pass Self-QA before it can be marked ready for human review.
> QA artifacts live in the `.qa/` directory.

---

## QA Artifact Structure

```
.qa/
├── FEATURE_CHECKLIST.md       # Template for feature QA files
├── RELEASE_CHECKLIST.md       # Pre-release validation checklist
├── BUG_REPORT_TEMPLATE.md     # Template for reporting bugs
└── features/                  # Per-feature QA files
    ├── auth.md
    ├── workspace-management.md
    ├── channel-membership.md
    ├── messaging.md
    ├── onboarding.md
    └── ...
```

---

## Feature QA Checklist Template

Every `.qa/features/<feature>.md` file must follow this structure:

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

---

## QA Lifecycle States

```
Implementation
     │
     ▼
Agent Self QA ──FAIL──→ Fix issues
     │
     PASS
     │
     ▼
Human QA ──FAIL──→ Agent revision → Re-run Self QA
     │
     PASS
     │
     ▼
Review Status: APPROVED
```

---

## Self-QA Requirements

Before marking a feature as ready for human review, the agent must:

1. **Run through every test case** in the feature QA file
2. **Verify no regressions** — run existing tests and typechecks
3. **Test across viewports** — desktop, tablet, mobile
4. **Test dark mode** if UI components were changed
5. **Verify error handling** — what happens when the API returns 400, 403, 404, 500?
6. **Verify optimistic updates** — are temp IDs swapped correctly on confirmation?
7. **Check console for errors** — no React warnings, no 404s, no unhandled promise rejections

---

## Release Checklist

Before any merge to `development` or `main`, the `.qa/RELEASE_CHECKLIST.md` must be completed.
