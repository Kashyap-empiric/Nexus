# Module Context Snapshots

This directory holds per-module context files for use by the agent when working on a specific module.

## Purpose

When the developer says **"update docs for [module]"** or **"work on [module]"**, the agent reads the relevant file here to get focused context without having to scan the entire codebase.

## Naming Convention

Files are named: `[module-name]-context.md`

Examples:
- `auth-route-context.md`
- `socket-server-context.md`
- `conversation-store-context.md`
- `message-list-component-context.md`

## What Each File Contains

Each module context file includes:

1. **Module summary** — what the module does, what problem it solves
2. **Current source code** (or the most important parts)
3. **Direct imports / dependencies** — what this module depends on
4. **Consumers** — what other modules import or use this one
5. **Open TODOs** — things still to be done in this module
6. **Related docs** — links to the `.docs/modules/` file for this module

## When to Create a File Here

Create or update a module-context file when:
- A new module is added with meaningful logic
- The developer is about to work on a specific module and wants focused context
- A module has grown complex enough that a global codebase scan is wasteful

## Current Module Context Files

*(none yet — added as the codebase grows)*
