# Nexus — Documentation Index

> **Last Updated:** 2026-06-22
> **Purpose:** Navigate the `.docs/` directory. Each file serves a specific audience and intent. Read this first.

---

## Quick Start

| If you need... | Read this |
|----------------|-----------|
| **Deep system understanding** | [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — Comprehensive reference with technology decisions |
| **High-level overview** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture with diagrams |
| **Database schema & ER diagrams** | [`DATABASE.md`](./DATABASE.md) — Models, relationships, access patterns |
| **REST + Socket API reference** | [`API_REFERENCE.md`](./API_REFERENCE.md) — OpenAPI-style endpoint catalog |
| **Feature inventory & status** | [`FEATURES.md`](./FEATURES.md) — What exists, what's partial, what's planned |
| **Project context & current state** | [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — Known issues, constraints, recent changes |
| **Technology rationale & alternatives** | [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md#technology-decisions) — Why each tool was chosen, what was rejected |
| **Environment variables** | [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) — Required/optional config |
| **Known limitations & debt** | [`LIMITATIONS.md`](./LIMITATIONS.md) — Technical debt, bugs, constraints |
| **Change history** | [`CHANGELOG.md`](./CHANGELOG.md) — Reverse-chronological change log |
| **Role selection guidance** | [`MEMBER_ROLE_SELECTION.md`](./MEMBER_ROLE_SELECTION.md) — Workspace role design |

---

## File Map

```
.docs/
├── README.md                    ← You are here. Navigation index.
├── PROJECT_OVERVIEW.md      ← Full system reference + technology decisions.
├── ARCHITECTURE.md              ← System architecture, diagrams, component map.
├── DATABASE.md                  ← ER diagrams, relationships, access patterns.
├── API_REFERENCE.md             ← REST endpoints + Socket events (OpenAPI-style).
├── FEATURES.md                  ← Feature inventory with implementation status.
├── PROJECT_CONTEXT.md           ← Current state, constraints, known issues.
├── LIMITATIONS.md               ← Technical debt, constraints, resolved items.
├── CHANGELOG.md                 ← Reverse-chronological change history.
├── ENVIRONMENT_VARIABLES.md     ← All env vars with descriptions and defaults.
└── MEMBER_ROLE_SELECTION.md     ← Workspace role design and rationale.
```

---

## Reading Paths by Role

### New Engineer Onboarding

```
README.md → PROJECT_OVERVIEW.md → ARCHITECTURE.md → DATABASE.md → API_REFERENCE.md
```

### Tech Lead / Architect Review

```
README.md → PROJECT_OVERVIEW.md → ARCHITECTURE.md → DATABASE.md → LIMITATIONS.md
```

### Feature Implementation

```
PROJECT_CONTEXT.md → API_REFERENCE.md → DATABASE.md → FEATURES.md
```

### Deployment / DevOps

```
PROJECT_OVERVIEW.md → ENVIRONMENT_VARIABLES.md → ARCHITECTURE.md
```

### Debugging / Troubleshooting

```
LIMITATIONS.md → API_REFERENCE.md → ARCHITECTURE.md → CHANGELOG.md
```

---

## Conventions

- **Mermaid diagrams** are used in `ARCHITECTURE.md`, `DATABASE.md`, and `PROJECT_OVERVIEW.md` — render in GitHub or any Mermaid-compatible viewer.
- **Date format:** `YYYY-MM-DD` throughout.
- **Status indicators:** ✅ Complete, 🟡 Partial, ❌ Not started, 🟢 Recently completed.
- All documentation is written for a senior engineering audience — assume familiarity with TypeScript, React, Node.js, PostgreSQL, and WebSocket concepts.
