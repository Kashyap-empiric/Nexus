# Agent Context

> **Last Updated:** 2026-06-26
> **Purpose:** Single source-of-truth context file for AI agents working on Nexus. All other `.agents/` files are local-only policy references. The authoritative TL-authored rules are in `Rules_Expectations.md` (project root).

---

## How This Repository Is Organized

### Git-Tracked Documentation

| Directory | Purpose | Auto-Update? |
|-----------|---------|-------------|
| `.docs/` | Polished, TL-ready docs — project overview, architecture, database, API reference, features, env vars, limitations, changelog | Only when explicitly asked |
| `.agents/context.md` | This file — single tracked agent context | ✅ Yes |
| `Rules_Expectations.md` | TL-authored project development rules (root) | Only when explicitly asked |

### Local-Only (`.gitignore`d)

All other `.agents/` policy files (e.g., `AGENT_RULES.md`, `DEVELOPMENT_WORKFLOW.md`, `DOCUMENTATION_POLICY.md`, `QA_POLICY.md`, `COMPLETION_POLICY.md`, `CONTEXT_UPDATE_POLICY.md`, `00-instructions.md`, `module-context/`) and `work/` directory remain on disk for local reference but are not committed.

---

## TL Rules (`Rules_Expectations.md` — Read First)

The top-level rules file covers:

| Section | Topic |
|---------|-------|
| 1 | Daily Update format |
| 2 | Daily Git Push — meaningful commits, conventional commit format (`type(scope): description`) |
| 3 | Branching Strategy — `feature/*` → `develop` → `staging` → `main` |
| 4 | Self QA Before Review — 7-point checklist |
| 5 | Documentation Requirement — every module must document Purpose, Flow, Key APIs, Important Logic |
| 6 | Context File Requirement — 8 required topics (project overview, features, architecture, folder structure, env vars, database schema, API list, known limitations) |
| 7 | AI Usage Policy — understand, verify, test, document AI-generated code |
| 8 | Research Before Asking — 5-step debug-first escalation |
| 9 | Development Order — Planning → DB → API → Auth → Core → Secondary → Tests → Docs → Demo |
| 10 | Final Submission Requirements — 8-item completion gate |

---

## Recent Addition: Message Threads (June 24–25)

**Phase 1 (June 24):** `Message.threadRootId` (self-FK), `threadReplyCount`, `lastThreadReplyAt`, `isThreadBroadcast`. `MessageMention` and `MessageReaction` models.

**Client modules:** `client/src/modules/threads/` — `ThreadPanel`, `ThreadInput`, `threadStore`, `useThreadMessages`, `WorkspaceThreadsView`, `ChannelThreadsBrowser`.

**Phase 2 enhancements (June 25):**
- **Thread Summaries API** — `getThreadSummaries`, `getThreadSummaryCounts` service methods
- **Workspace Threads Page** — Slack-style card-based feed at `/workspaces/[slug]/threads` with sidebar entry, channel pills, participant avatars, reply counts
- **Channel Threads Browser** — `ChannelThreadsBrowser` component; Threads tab in InfoPanel
- **Message Actions Toolbar** — Copy/edit/delete on thread replies; formatting toolbar in edit mode
- **Thread Panel as Right Pane** — Right-side detail pane integration
- **Editor Consolidation** — Reusable `MessageInput` component shared between main chat and threads
- **Discord-style Thread Icon** — `ThreadIcon` component replacing `MessageSquare`
- **useOptimisticMessage Hook** — Utility for pending message state checking
- **Optimistic Reply Fix** — `threadStore.addReply` replaces pending placeholder
- **Auth Metadata Fix** — `avatarUrl`/`fullName` from `user_metadata`

**Socket events:** `threadMessage:new` — dispatched to conversation room for real-time thread reply delivery.

**Navigation refactor:** Use `useRouteState()` from `shared/hooks/useRouteState.ts` to derive `mode`/`activeWorkspaceId` from URL params. Sidebar no longer depends on `useChatStore` for navigation state.

**User footer:** `UserFooterMenu` replaces `StatusSelector` — unified dropdown with profile, status, sign-out.

## Quick Reference

### Branching

```
feature/* → Self QA → Push → develop → Merge Request → staging → Review → main
```

No direct push to `main`.

### Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

### Self-QA Checklist (Before Review)

- [ ] Functionality verified
- [ ] Positive scenarios tested
- [ ] Negative scenarios tested
- [ ] Console errors checked
- [ ] API errors checked
- [ ] Database updates verified
- [ ] Responsive UI verified

### Feature Lifecycle

```
Read Context → Analyze → Plan → Implement → Document → QA → Self-Test → Ready for Review
```

### Documentation Per Module

Every module doc must include: **Purpose**, **Flow**, **Key APIs**, **Important Logic**.

### Completion Gate

A feature is complete only when ALL of these pass:

- [ ] Features implemented
- [ ] Code committed
- [ ] Documentation completed
- [ ] Self QA completed
- [ ] Demo prepared
- [ ] Architecture explained
- [ ] AI usage report submitted
- [ ] Known limitations documented

---

## Documentation Structure

### `.docs/` — TL-Ready Docs (Read-Only Unless Asked)

| File | Covers |
|------|--------|
| `PROJECT_OVERVIEW.md` | Full system reference, architecture, technology decisions (including alternatives considered) |
| `ARCHITECTURE.md` | System architecture diagrams, communication patterns, module dependencies |
| `DATABASE.md` | ER diagrams, schema, access patterns, indexing strategy |
| `API_REFERENCE.md` | REST endpoints + Socket.io events catalog |
| `FEATURES.md` | Feature inventory with implementation status |
| `PROJECT_CONTEXT.md` | Current state, production constraints, known issues, recent changes |
| `LIMITATIONS.md` | Technical debt, bugs, constraints (critical, moderate, minor) |
| `ENVIRONMENT_VARIABLES.md` | Required and optional env vars with defaults |
| `CHANGELOG.md` | Reverse-chronological change history |

### `.qa/` — QA Artifacts

- `FEATURE_CHECKLIST.md` — Template for feature QA files
- `RELEASE_CHECKLIST.md` — Pre-release validation
- `features/<name>.md` — Per-feature QA checklists

### `work/` — Agent Territory (Local-Only, Not Tracked)

| Subdirectory | Purpose |
|-------------|---------|
| `work/bugs/` | Per-module bug tracking |
| `work/plans/` | Feature implementation plans |
| `work/audits/` | Code and UX audit results |
| `work/logs/` | Incremental and daily session logs |

---

## Key Contacts

For questions about the rules in this file or `Rules_Expectations.md`, refer to the TL. All other `.agents/` policy files on disk contain supplementary detail but the tracked source of truth is this file and the root `Rules_Expectations.md`.
