# DOCUMENTATION_POLICY — When & What to Document

> **Mandatory:** Any feature that changes code must also update the relevant documentation
> before the task can be considered complete.
> Aligns with `Rules_Expectations.md` Section 5 (Documentation Requirement), Section 6 (Context File Requirement), and Section 7 (AI Usage Policy).

---

## Two Documentation Tiers

### `.docs/` — Polished, TL-Ready Docs
Agent reads these for context. **Do NOT auto-update** unless explicitly instructed by the user.

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | Current system state, implementation status |
| `ARCHITECTURE.md` | System architecture, data flow, module structure |
| `DATABASE.md` | Database schema, models, enums |
| `API_REFERENCE.md` | REST endpoints, socket events |
| `FEATURES.md` | Feature inventory with status |
| `ENVIRONMENT_VARIABLES.md` | All env vars with descriptions |
| `LIMITATIONS.md` | Known limitations and tech debt |
| `CHANGELOG.md` | Version history |

### `work/` — Agent's Working Docs (Auto-Maintained)
Agent CAN and SHOULD auto-create and auto-update files here.

| Directory | Purpose | Auto-Update Behavior |
|-----------|---------|---------------------|
| `work/bugs/` | Bug tracking | Create new bug file when issue found. Update existing when fixed. |
| `work/plans/` | Feature plans | Create plan file for new features. |
| `work/audits/` | Code audits | Append audit results. |
| `work/logs/incremental-logs.md` | Per-change logs | Append entry after EVERY code change. |
| `work/logs/daily-logs.md` | Session summaries | Append only when user says "log progress" or "update daily logs". |
| `work/archive/` | Deprecated docs | Read-only. |

---

## What Must Be Documented

### Always (for every code change)

| Document | Update Required |
|----------|----------------|
| `work/logs/incremental-logs.md` | ✅ Append after EVERY code change — what changed, why, files touched |
| `work/bugs/<module>.md` | ✅ If a bug is discovered or fixed |
| `.qa/features/<feature>.md` | ✅ If a new feature is added |

### When Instructed by User

| Document | Trigger |
|----------|---------|
| `work/logs/daily-logs.md` | User says "log progress", "update daily logs", or end of day |

### When Applicable

| Document | Trigger |
|----------|---------|
| `work/plans/<feature>.md` | New feature or significant change |
| `work/audits/<topic>.md` | Code review, UX audit, performance analysis |

---

## When to Update `.docs/` (User's TL Docs)

Only update `.docs/` files when **explicitly asked** by the user. These are polished docs intended for the user's tech lead — the agent should treat them as read-only during normal feature work.

---

## Documentation Quality Standards

Per `Rules_Expectations.md` Section 5, every module doc must cover:

- **Purpose** — What the module does
- **Flow** — How it works step by step
- **Key APIs** — Relevant endpoints or functions
- **Important Logic** — Notable implementation details

Documentation should allow another developer to understand the module without asking questions.

Additional standards:

1. **Be accurate** — Document the system as it IS, not as it SHOULD BE.
2. **Be concise** — Prefer bullet points and tables over paragraphs.
3. **Include examples** — API docs should include request/response examples.
4. **Date every entry** — Every file must have a `Last Updated:` timestamp.
5. **Cross-reference** — Link to related modules and docs.

---

## Module Documentation Template (for `docs/modules/`)

```markdown
# Module Name

## Purpose
What this module does.

## Flow
User flow and system flow.

## Key APIs
List endpoints/actions.

## Database Models
Tables used.

## Important Logic
Business rules.

## Permissions
Authorization rules.

## Edge Cases
Known edge cases.

## Future Improvements
Planned enhancements.
```

---

## Context File Requirements

Per `Rules_Expectations.md` Section 6, the `.docs/` directory must maintain:

- Project overview
- Features
- Architecture
- Folder structure
- Environment variables
- Database schema
- API list
- Known limitations

These must be updated after every major feature.

## AI Usage Documentation

Per `Rules_Expectations.md` Section 7, every major implementation must include an AI usage report documenting:

- What was implemented
- Files modified
- Decisions made
- Risks or technical debt introduced
- Follow-up work

Store AI usage reports in `.docs/ai-reports/`.

## When NOT to Document

- Cosmetic changes that do not affect functionality or APIs
- Internal refactoring that does not change public interfaces
- Dependency updates that do not change behavior
