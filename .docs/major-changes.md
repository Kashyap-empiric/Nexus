# Major Changes and Architectural Decisions

> This document tracks the most significant changes made to the Nexus codebase, including the rationale behind large architectural decisions, large refactors, or new paradigms.

## Documentation System Standardization (10th June 2026)
- **What Changed**: Introduced a structured documentation strategy splitting internal operational logs (`.docs/`), agent instructions (`.agents/`), and public-facing project docs (`public-docs/`).
- **Why**: As the project scales, having a unified way for both humans and AI agents to understand the project structure, history, and active modules is essential. Segregating internal tracking from public architecture docs reduces confusion and keeps the codebase maintainable.

## Decoupling Conversation Metadata via CONVERSATION_UPDATE (10th June 2026)
- **What Changed**: Shifted the responsibility of managing conversation metadata (e.g., `latestMessage`, `updatedAt`) entirely to the server via a new `CONVERSATION_UPDATE` socket event. `MESSAGE_*` socket events now strictly handle raw message lists and unread count badge incrementation.
- **Why**: Previously, the client was inferring and mutating conversation metadata (like previewing the latest message or guessing the next latest message after a deletion). This led to race conditions and violated the server's authority. By decoupling the events, the frontend no longer has to guess state, preparing the system beautifully for future features like Channels and Workspaces where metadata can change independently of messaging.
