# Nexus Agent Instructions — Documentation Updater

> These instructions tell you exactly what to do when the developer says:
> **"update the docs"** or **"update docs for [X]"**
>
> Read these instructions fully before starting. Follow each section in order.
> Do not skip steps. Do not guess — use the project context files listed below.

---

## Context Files to Read First

Before doing anything, read these files to understand the current state of the project:

| File | Purpose |
|---|---|
| `.agents/project-context.md` | Full project overview, tech stack, architecture summary |
| `.docs/progress.txt` | Current daily progress log — read to understand what was last done |
| `.docs/structure.txt` | Current known file/folder structure |
| `.docs/architecture.md` | Current architecture doc |
| `.docs/data-flow.md` | Current data flow doc |
| `.docs/modules/` | All existing per-module docs |
| `NEXUS_SLACK_CLONE.md` | Master project specification |

Also run `tree` to get the current file structure (excluding node_modules, .next, .git):
```bash
tree /home/empiric/Desktop/Kashyap/nexus -I 'node_modules|.next|.git' -a
```

---

## Step 1 — Update `progress.txt`

File: `.docs/progress.txt`

1. Add a new dated entry at the **bottom** of the file (or the top if reverse-chronological is preferred — be consistent with existing format).
2. Fill in the sections:
   - **ADDED**: new files, features, or modules introduced since the last entry
   - **CHANGED**: modifications to existing functionality, refactors, config changes
   - **REMOVED**: deleted files, deprecated features
   - **NOTES**: architectural decisions, context, or caveats
3. Update the `[NEXT UP]` section to reflect what comes next based on the project spec.

**Do NOT fabricate entries.** Only log changes that are actually present in the codebase.

---

## Step 2 — Update `structure.txt`

File: `.docs/structure.txt`

1. Run `tree` with `--ignore node_modules .next .git` (use the `-I` flag).
2. Replace the tree content in the file with the new output.
3. Update the `Last Updated` date at the top.
4. Annotate each new file or folder with a short inline comment explaining its purpose.
5. Mark any folders that are **WIP** (work in progress) or **empty**.

---

## Step 3 — Update or Create Module Docs

Directory: `.docs/modules/`

### When to CREATE a new module doc

Create a new `.md` file for every **new module** that was added since the last doc update. A "module" is any of:
- A new route segment (Next.js page or layout)
- A new API route handler (Express route)
- A new React component (if it has meaningful logic)
- A new custom hook
- A Prisma schema change
- A Socket.io event handler
- A Zustand store
- A TanStack Query hook

### When to UPDATE an existing module doc

Update the existing file when:
- The module's behavior, props, or API surface changed
- A new diagram is needed to explain new interactions
- A new dependency was added to the module

### Module Doc Template

Use this exact structure for every module doc.
**Every section is required.** If a section doesn't apply, write `N/A` with a one-line reason — do not omit the heading.
The goal is that another developer can understand this module fully without asking any questions.

```markdown
# Module: [Module Name]

> **Location:** `path/to/file`
> **Type:** [e.g., Next.js Page | Express Route | React Component | Socket Handler | Zustand Store]
> **Last Updated:** YYYY-MM-DD
> **Status:** [🚧 WIP | ✅ Active | ⛔ Deprecated]

## Purpose
[1–3 sentences. What problem does this module solve? Why does it exist?
Be specific — "handles auth" is not enough; explain *how* and *what* it gates.]

## Flow
[Mermaid flowchart or sequence diagram showing the internal logic and all interactions.
Must show: inputs → processing steps → outputs → side effects.]

## Key APIs
[Every exported function, class, hook, route, or event this module exposes.
Use a table:
| Name | Type | Parameters | Returns | Description |
For REST routes: Method, Path, Auth required, Body, Response.
For Socket events: Direction, Event name, Payload shape, Side effects.]

## Important Logic
[Bullet list of non-obvious decisions, edge cases, or business rules embedded in this module.
Examples:
- Why a specific algorithm or data structure was chosen
- Constraints enforced (e.g., DM must have exactly 2 members)
- How errors are handled and what the caller should expect
- Performance considerations (indexes relied on, N+1 risks, etc.)
- Security assumptions (e.g., which middleware must run before this handler)]

## Inputs / Props / Parameters
[Table of all inputs — function args, React props, env vars consumed, query params, request body fields.]

## Outputs / Events / Return Values
[Table of all outputs — return values, emitted events, side effects, mutations.]

## Interactions With Other Modules
[Mermaid diagram or list showing what this module imports and what imports it.]

## Change Log
[Table: Date | Change — newest entry first]
```

### Diagram Requirements

Every module doc **must** include at least one Mermaid diagram. Choose the right diagram type:

| Module Type | Preferred Diagram |
|---|---|
| Data flow / pipeline | `flowchart TD` or `flowchart LR` |
| Request/response | `sequenceDiagram` |
| State machine | `stateDiagram-v2` |
| DB relationships | `erDiagram` |
| Component tree | `flowchart TD` |

---

## Step 4 — Update `data-flow.md`

File: `.docs/data-flow.md`

Update only if any of the following changed:
- A new data pathway was introduced (e.g., a new API endpoint, a new Socket.io event)
- The persistence strategy changed
- The auth flow changed
- Redis usage changed

When updating:
1. Update the relevant diagram(s) only — do not rewrite the whole document unless the flow fundamentally changed.
2. Update the `Last Updated` date at the top.
3. Add a brief note under the changed section explaining what changed and why.

---

## Step 5 — Update `architecture.md`

File: `.docs/architecture.md`

Update only if any of the following changed:
- A new service or layer was added (e.g., background jobs, new external API)
- The deployment strategy changed
- A major architectural decision was made or reversed
- A new phase milestone was reached

When updating:
1. Update only the affected section and diagram.
2. Update the `Last Updated` date.
3. Add a row to the **Key Architectural Decisions** table if a new decision was made.

---

## Scope Rules

| Developer Says | What You Update |
|---|---|
| "update the docs" | Steps 1–5 above (full update) |
| "update docs for [module name]" | Step 1 (progress), Step 3 (that module's doc only) |
| "update the structure" | Step 1 (progress), Step 2 (structure.txt only) |
| "update the data flow" | Step 1 (progress), Step 4 (data-flow.md only) |
| "update the architecture doc" | Step 1 (progress), Step 5 (architecture.md only) |

---

## Quality Rules

- **Self-contained.** A developer reading only the module doc must understand it fully. No follow-up questions needed. This is the primary quality bar.
- **Never fabricate.** Every doc entry must be based on actual code in the repository.
- **Be precise.** Use exact file paths, function names, event names, payload shapes. Not vague descriptions.
- **Diagrams must be valid Mermaid.** Test your Mermaid syntax mentally. Avoid unclosed brackets or invalid node labels.
- **Key APIs must be exhaustive.** Every exported symbol, route, or event must appear in the Key APIs table. If it's callable from outside the module, it is an API.
- **Important Logic must capture the non-obvious.** Do not just describe what the code does. Explain *why* it does it that way. Constraints, edge cases, and business rules belong here.
- **Keep prose terse.** Docs are for developers. Bullet points and tables beat paragraphs.
- **Preserve existing content.** When updating a file, modify only the sections that changed.
- **Date format.** Always use `YYYY-MM-DD`.
- **No em dashes.** Never use em dashes (`—`) anywhere in documentation. They render inconsistently and look bad. Use a colon, a period, or rewrite the sentence instead.
