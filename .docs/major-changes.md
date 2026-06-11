# Major Changes and Architectural Decisions

> This document tracks the most significant changes made to the Nexus codebase, including the rationale behind large architectural decisions, large refactors, or new paradigms.

## Phase 1 Deviation Audit (10th June 2026)
- **What Changed**: Conducted a deep forensic audit of the Phase 1 sprint. Exposed critical technical debt regarding transaction boundaries, overloaded controllers, soft-delete leakage, and horizontal scaling limits.
- **Why**: To prevent the accumulation of unrecorded tech debt before moving to Phase 2 (Workspaces/Channels). This audit established the `.docs/AS_IS_ARCHITECTURE.md` and `.docs/TECHNICAL_DEBT.md` as the canonical source of truth for the project.

## Documentation System Standardization (10th June 2026)
- **What Changed**: Introduced a structured documentation strategy splitting internal operational logs (`.docs/`), agent instructions (`.agents/`), and public-facing project docs (`public-docs/`).
- **Why**: As the project scales, having a unified way for both humans and AI agents to understand the project structure, history, and active modules is essential. Segregating internal tracking from public architecture docs reduces confusion and keeps the codebase maintainable.

## Decoupling Conversation Metadata via CONVERSATION_UPDATE (10th June 2026)
- **What Changed**: Shifted the responsibility of managing conversation metadata (e.g., `latestMessage`, `updatedAt`) entirely to the server via a new `CONVERSATION_UPDATE` socket event. `MESSAGE_*` socket events now strictly handle raw message lists and unread count badge incrementation.
- **Why**: Previously, the client was inferring and mutating conversation metadata (like previewing the latest message or guessing the next latest message after a deletion). This led to race conditions and violated the server's authority. By decoupling the events, the frontend no longer has to guess state, preparing the system beautifully for future features like Channels and Workspaces where metadata can change independently of messaging.

## UI Refinements (10th June 2026)
- **What Changed**: feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
- **Why**: To provide a clearer call-to-action for users rather than relying on an implicit full-row click.

## Invite Architecture Platform Polish (11th June 2026)
- **What Changed**: Transitioned legacy 'TargetType' semantics to generic 'entityId/type' nomenclature to prepare for horizontal scaling. Implemented a 24-hour unique active-link rotation policy, smart 'consumed' semantics preventing existing members from draining invite capacity, and hardened the database with a trigger to strictly limit DM group sizes.
- **Why**: To establish a hardened, scalable foundation for the upcoming Workspaces and Channels features, ensuring that the unified invite pipeline can generically handle any future 'entity' safely and cleanly.
