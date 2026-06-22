# DEVELOPMENT_WORKFLOW — Mandatory Feature Lifecycle

> **This is the default workflow for every feature implementation.**
> Agents must follow these steps in order. No step may be skipped.
> Aligns with `Rules_Expectations.md` Section 9 (Development Order).

---

## The 8-Step Feature Lifecycle

### Step 1: Read Project Context
- Read `.docs/PROJECT_CONTEXT.md` for the current system state.
- Read `.docs/ARCHITECTURE.md` for architecture guidelines.
- Read `.agents/AGENT_RULES.md` for coding and architecture standards.

### Step 2: Analyze Feature Request
- Read existing module documentation in `docs/modules/<relevant>.md`.
- Check `work/bugs/<relevant>.md` for known issues in the affected area.
- Check `work/logs/daily-logs.md` for recent progress context.
- Search the codebase for existing patterns, types, and APIs.
- Identify all files that will need changes.
- Check `.docs/LIMITATIONS.md` and `.docs/CHANGELOG.md` for relevant history.

### Step 3: Create Implementation Plan
- Write the plan to `work/plans/<feature-name>.md` (if non-trivial).
- Outline the specific files to create/modify.
- Define the data flow (client → API → server → DB → socket → client).
- Identify edge cases and error states.
- **If the plan involves significant architectural changes, run it by the user first.**

### Step 4: Implement Feature
- Follow `AGENT_RULES.md` coding standards.
- Adhere to existing module structure and patterns.
- Do NOT introduce new dependencies without checking `package.json` first.
- Include loading, empty, and error states for every UI component.

### Step 5: Update Documentation
- Update `work/logs/daily-logs.md` with a log entry for this session.
- Update `work/bugs/<module>.md` if bugs were fixed or discovered.
- If bugs were fixed, update the bug file's status to FIXED with resolution notes.
- See `DOCUMENTATION_POLICY.md` for detailed rules.
- **Note:** `.docs/` files are TL-ready docs — do not auto-update them unless explicitly asked.

### Step 6: Generate/Update QA Files
- Create or update `.qa/features/<feature-name>.md` with the feature QA checklist.
- Include positive tests, negative tests, API verification, DB verification, and UI verification.
- See `.qa/FEATURE_CHECKLIST.md` for the template.

### Step 7: Perform Self-QA
- Run through the QA checklist from Step 6.
- Mark `Agent Self QA: PASS / FAIL` in the feature QA file.
- Run typechecks (`npm run typecheck` or equivalent).
- Run existing tests to verify no regressions.
- **Fix any failures before proceeding.**

### Step 8: Mark Ready for Human Review
- Set `Human QA: PENDING` in the feature QA file.
- Set `Review Status: READY_FOR_REVIEW`.
- Summarize the changes made, files touched, and any notable design decisions.

---

## Workflow Diagram

```
Read Context → Analyze → Plan → Implement → Document → QA → Self-Test → Ready for Review
     │           │          │        │           │       │        │             │
     └───────────┴──────────┴────────┴───────────┴───────┴────────┴─────────────┘
                                      ↑
                              (user approval if
                              architectural change)
```

---

## Quick Reference

| Step | Artifact | Required |
|------|----------|----------|
| 1-2 | Context gathered | ✅ |
| 3 | Implementation plan (implicit or written) | ✅ |
| 4 | Working code | ✅ |
| 5 | Module doc + PROJECT_CONTEXT + CHANGELOG updated | ✅ |
| 6 | Feature QA file created/updated | ✅ |
| 7 | Agent Self QA: PASS | ✅ |
| 8 | Human QA: PENDING, Review Status: READY_FOR_REVIEW | ✅ |
