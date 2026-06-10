# Major Changes and Architectural Decisions

> This document tracks the most significant changes made to the Nexus codebase, including the rationale behind large architectural decisions, large refactors, or new paradigms.

## Documentation System Standardization (10th June 2026)
- **What Changed**: Introduced a structured documentation strategy splitting internal operational logs (`.docs/`), agent instructions (`.agents/`), and public-facing project docs (`public-docs/`).
- **Why**: As the project scales, having a unified way for both humans and AI agents to understand the project structure, history, and active modules is essential. Segregating internal tracking from public architecture docs reduces confusion and keeps the codebase maintainable.
