# Project Completion Policy (Mandatory)

> Aligns with `Rules_Expectations.md` Section 10 (Final Submission Requirements).

A task, feature, module, or project MUST NOT be considered complete merely because the code compiles or the functionality appears to work.

Completion requires all of the following criteria to be satisfied.

---

## 1. Feature Implementation

* All requested requirements have been implemented.
* Acceptance criteria have been satisfied.
* Edge cases have been addressed.
* Permissions and security requirements have been verified.

---

## 2. Code Quality

* Code follows established project architecture.
* Existing patterns are reused where appropriate.
* No unnecessary duplication exists.
* Dead code, temporary debugging code, and unused files have been removed.
* Build, lint, and type checks pass.

---

## 3. Documentation

The agent MUST update documentation whenever functionality changes.

Required updates:

* `.docs/PROJECT_CONTEXT.md`
* Relevant module documentation in `.docs/modules/`
* API documentation
* Database documentation (if schema changed)
* Environment variable documentation (if applicable)
* Architecture documentation (if applicable)
* Changelog

Documentation must include:

* Purpose
* Flow
* Key APIs
* Important logic
* Permissions
* Edge cases
* Known limitations

---

## 4. Self QA

Before requesting review, the agent MUST perform self-verification.

Required checks:

### Positive Testing

Verify intended functionality works correctly.

### Negative Testing

Verify invalid actions fail correctly.

### API Verification

Verify:

* Status codes
* Error handling
* Validation rules
* Permission checks

### Database Verification

Verify:

* Records created correctly
* Records updated correctly
* Records deleted correctly
* No unintended side effects

### UI Verification

Verify:

* Desktop
* Tablet
* Mobile
* Loading states
* Empty states
* Error states

### Error Verification

Verify:

* No console errors
* No runtime errors
* No unexpected warnings

Self QA results must be documented in `.qa/features/<feature>.md`.

---

## 5. Architecture Explanation

For every major feature, the agent must document:

* Design decisions
* Data flow
* API flow
* Database interactions
* Permission model
* Tradeoffs made

Another developer should be able to understand the implementation without requiring verbal explanation.

---

## 6. AI Usage Report

For every major implementation, the agent must generate an AI Usage Report containing:

### Scope

What was implemented.

### Files Modified

List of affected files.

### Decisions Made

Important implementation decisions.

### Risks

Potential concerns or technical debt.

### Follow-up Work

Future improvements or recommended next steps.

Store reports in:

```
.docs/ai-reports/
```

---

## 7. Known Limitations

Every feature must document its known limitations **inside the relevant module documentation file** in `.docs/modules/`.

Do NOT create a separate limitations file. Add or update a `## Known Limitations` section directly in the module doc that owns the feature.

Document the following:

* Current limitations of the implementation
* Deferred improvements (with brief rationale for deferral)
* Technical debt introduced
* Unsupported edge cases and why they are not handled

**Known limitations must be updated whenever:**

* New functionality is added to the module
* A limitation is resolved (mark it as resolved with date)
* A new edge case is discovered

**Example location:**

```
.docs/modules/messages.md       → Known Limitations for the Messages module
.docs/modules/notifications.md  → Known Limitations for the Notifications module
.docs/modules/workspaces.md     → Known Limitations for the Workspaces module
```

**Example format inside the module doc:**

```markdown
## Known Limitations

| Limitation | Reason Deferred | Introduced |
|---|---|---|
| Socket emissions are fire-and-forget — no retry on failure | Requires a queue system (not in scope for MVP) | 2026-06-09 |
| Rate limiter is in-memory — breaks in multi-instance deployments | Redis-backed limiter planned post-MVP | 2026-06-09 |
```


---

## 8. Demo Preparation

Before marking a feature complete, the agent must provide:

### Demo Flow

Step-by-step demonstration scenario.

### Test Accounts

Required accounts, permissions, or setup.

### Expected Results

Expected outcome for each demo step.

Store demo documentation in:

```
.docs/demos/
```

---

## 9. Completion Gate

A feature or project may only be marked COMPLETE when ALL of the following are true:

* [ ] Features implemented
* [ ] Code committed
* [ ] Documentation completed
* [ ] Self QA completed
* [ ] Demo prepared
* [ ] Architecture explained
* [ ] AI usage report submitted
* [ ] Known limitations documented

If any item remains incomplete, status must remain:

`IN_PROGRESS`

or

`READY_FOR_REVIEW`

but never `COMPLETE`.
