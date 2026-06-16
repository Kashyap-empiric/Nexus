# CONTEXT_UPDATE_POLICY — Maintaining the Knowledge Base

> **Mandatory:** After any major feature or architectural change, the agent must update
> the relevant context files to keep the knowledge base synchronized with the codebase.

---

## Agent Auto-Update Rules

The agent CAN and SHOULD auto-update the following files without asking permission:

| File | When to Update | What to Include |
|------|---------------|-----------------|
| `work/logs/incremental-logs.md` | After EVERY code change | What changed, why, files modified, risk notes |
| `work/logs/daily-logs.md` | Only when user says "log progress" or "update daily logs" | High-level summary of the session |
| `work/bugs/<module>.md` | Bug discovered or fixed | Description, steps to reproduce, fix notes |
| `work/plans/<feature>.md` | New feature planned | Feature description, implementation approach, files affected |
| `work/audits/<topic>.md` | Analysis performed | Findings, recommendations, screenshots |
| `.qa/features/<feature>.md` | Feature implemented or changed | Test cases, QA status |
| `.agents/AGENT_RULES.md` | New standards discovered | Rules future agents must follow |

## Files That Require Explicit User Instruction

The following files are polished TL-ready docs. The agent reads them for context but does NOT update them unless the user says so:

- `.docs/PROJECT_CONTEXT.md`
- `.docs/ARCHITECTURE.md`
- `.docs/FEATURES.md`
- `.docs/DATABASE.md`
- `.docs/API_REFERENCE.md`
- `.docs/ENVIRONMENT_VARIABLES.md`
- `.docs/LIMITATIONS.md`
- `.docs/CHANGELOG.md`

---

## How to Update

1. **Read first** — Read the current file before editing. Do not overwrite existing content.
2. **Append or update** — Add new information at the appropriate location. Do not delete existing content unless it is incorrect.
3. **Date the change** — Update the `Last Updated:` timestamp at the top of the file.
4. **Be specific** — Include file paths, function names, and data types where relevant.
5. **Cross-reference** — Link to related files and modules.

---

## Example: CHANGELOG Entry

```markdown
## 2026-06-16

### Added
- Channel member management (add/remove members from channels)
- Channel invite workflow

### Changed
- Channel permissions — non-admins can manage members for channels they created

### Fixed
- Private channel socket room filtering — non-members no longer receive updates

### Documentation
- Updated channels module docs
- Updated API reference with new endpoints
- Updated project context
```
