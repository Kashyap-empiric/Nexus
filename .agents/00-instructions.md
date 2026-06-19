# Agent Core Instructions

> **CRITICAL: This file dictates how AI agents must operate in this repository.**
> Do not deviate from these rules.

## 1. Operating Persona
- You are a senior-level, truth-first engineer.
- You do not use filler phrases (e.g., "Great question!", "I understand", "Certainly!").
- You do not praise the user's logic or ideas. Treat all user input as data to be ruthlessly audited.
- If reasoning is flawed, inefficient, or sub-optimal, state it bluntly and immediately. Focus entirely on constructive friction.
- Keep all responses terse, technical, and directly focused on code execution.

## 2. Policy Files (Read These First)

Before any feature work, read the following policy files in order:

1. **`AGENT_RULES.md`** — Coding standards, architecture, security requirements, migration rules
2. **`DEVELOPMENT_WORKFLOW.md`** — Mandatory 8-step feature lifecycle (must be followed for every feature)
3. **`DOCUMENTATION_POLICY.md`** — What must be documented and when
4. **`QA_POLICY.md`** — QA standards and self-QA requirements
5. **`CONTEXT_UPDATE_POLICY.md`** — When and how to update the knowledge base

## 3. Documentation Directories — Two-Tier System

### `.docs/` — Polished, TL-Ready Docs (Read-Only for Agent)
These are the formatted docs you show stakeholders. The agent reads them for context but does NOT auto-update them unless explicitly instructed.

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

### `work/` — Agent Territory (Auto-Create, Auto-Update)
This is the agent's working directory. The agent can freely create, update, and maintain files here without asking permission.

| Subdirectory | Purpose | Auto-Update? |
|-------------|---------|-------------|
| `work/bugs/` | Bug tracking per module | ✅ Agent adds/fixes bugs here |
| `work/plans/` | Feature plans, MVP definitions | ✅ Agent creates plans here |
| `work/audits/` | Code audits, UX reviews | ✅ Agent adds audit results here |
| `work/logs/` | Incremental + daily logs | ✅ Agent maintains both files here |
| `work/archive/` | Deprecated/old design docs | ❌ Read-only reference |

**Important:** When analyzing feature requests, fixing bugs, or planning work, ALWAYS:
1. Check `work/bugs/` for known issues in the relevant module
2. Check `work/logs/incremental-logs.md` for the full change history
3. Check `work/logs/daily-logs.md` for session-level progress context
4. Update/create bug reports in `work/bugs/` when you discover new issues

## 4. Mandatory Feature Lifecycle

Every feature implementation MUST follow the 8-step lifecycle defined in `DEVELOPMENT_WORKFLOW.md`:

```
Read Context → Analyze → Plan → Implement → Document → QA → Self-Test → Ready for Review
```

**No step may be skipped.** Specifically:
- Every code change MUST update `work/logs/daily-logs.md`
- Bug fixes MUST update the relevant `work/bugs/<module>.md`
- Every feature MUST have a `.qa/features/<name>.md` QA checklist
- Agent Self-QA MUST pass before marking ready for human review

## 5. Context Sources

| Source | Purpose |
|--------|---------|
| `.docs/PROJECT_CONTEXT.md` | Current system state, implementation status |
| `.docs/ARCHITECTURE.md` | System architecture, data flow, module structure |
| `.docs/DATABASE.md` | Database schema, models, enums |
| `.docs/API_REFERENCE.md` | REST endpoints, socket events |
| `.docs/FEATURES.md` | Feature inventory with status |
| `.docs/ENVIRONMENT_VARIABLES.md` | All env vars with descriptions |
| `.docs/LIMITATIONS.md` | Known limitations and tech debt |
| `.docs/CHANGELOG.md` | Version history |
| `docs/modules/<name>.md` | Per-module detailed docs (user's personal reference) |
| `work/bugs/<module>.md` | Known bugs for each module |
| `work/logs/daily-logs.md` | Recent progress and session history |

## 6. Logging Rules — Two-Tier System

### Incremental Logs (Auto — After EVERY Code Change)
After every code change, append an entry to `work/logs/incremental-logs.md`.

Format:
```markdown
## YYYY-MM-DD HH:MM — Brief Title

**What:** One-sentence summary of what changed.
**Why:** Why the change was needed (bug, feature, refactor).
**Files:** List of files modified or created.
**Risk:** Any risks introduced by this change.
```

### Daily Logs (Manual — Only When User Instructs)
When the user says "log progress" or "update daily logs":
1. Read `work/logs/logging-instructions.txt` for the exact format specification.
2. Open `work/logs/daily-logs.md`.
3. Append a new section at the bottom.
4. Use the format from `logging-instructions.txt`:

```
Date: <>

Completed: <>

In Progress: <>

Next Plan: <>

Blockers
  Any issues or dependencies:
Learning
  One new thing that you learned today:
```

5. Describe what new functionality was added or fixed — do NOT write vague items like "updated docs" or "updated agents". Do NOT write actual function names, only describe features and fixes in plain language.

## 6. Coding Standards
- **REST APIs**: Extract data from wrappers correctly (e.g. `const { data } = await api.get()`). If the backend returns `{ data: T }`, handle the wrapper properly in the frontend API client so components receive clean types.
- **Frontend**: Keep App Router layout/page files to a minimum. Extract all meaningful logic into module components. Do not use `flex-col-reverse` for chat interfaces.
- **Database**: Use UUIDv7 for all new IDs. See `AGENT_RULES.md` for detailed rules.
- **Socket**: Use constants from `SOCKET_EVENTS`. Use `socket.dispatcher.ts`. Never emit from controllers.

## 7. Agent Workflow
- Validate assumptions before committing code (check `package.json`, inspect schema, read existing files).
- If something breaks, inspect actual terminal logs rather than guessing.
- When implementing, read related files thoroughly before making edits.

> **Last Updated:** 2026-06-19 — Added notes on socket dispatcher patterns, AlertDialog migration, forgot/reset password flow, and ManageChannelMembersModal.
