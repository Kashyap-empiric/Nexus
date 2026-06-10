# Nexus Documentation

Welcome to the main documentation for the Nexus project. This directory (`public-docs/`) contains all the necessary architectural overviews, module descriptions, and file structure definitions needed to understand the application.

> **CRITICAL**: The Nexus backend architecture has undergone a massive Phase 1 Forensic Audit. Ensure you read `.docs/AS_IS_ARCHITECTURE.md` and `.docs/TECHNICAL_DEBT.md` before attempting any new features or assuming system behavior.

## Overview

Nexus is a full-stack communication platform consisting of a Node.js backend (`server/`) and a React-based frontend (`client/`). The system relies heavily on a modular architecture where each feature is compartmentalized into its own module containing both the UI elements (on the client) and the business logic/API routes (on the server).

## Key Resources

- **[AS-IS Architecture](../AS_IS_ARCHITECTURE.md)**: The brutally honest breakdown of the current data flows and technical realities.
- **[Technical Debt](../TECHNICAL_DEBT.md)**: Mandatory reading to prevent data corruption via race conditions and non-transactional reads.
- **[File Structure](./file-structure.md)**: A high-level view of the repository's directory layout.
- **[Client & Server Modules](./modules/)**: Documentation outlining specific domains like Auth, Chat, Conversations, and Users.

## Modules Summary

The application is broken down into specific domains. Each domain generally has a representation on both the client and the server:

1. **Auth**: Handles user authentication, registration, login, and session persistence via Supabase Auth + Prisma DB Triggers.
2. **Chat / Messages**: The core communication feature. Handles message delivery (REST + Socket.io `MESSAGE_NEW`), optimistic UI caching, and history pagination (which currently suffers from a `createdAt` ordering bug).
3. **Conversations**: Manages the containers for messages (e.g., one-on-one chats). Features `CONVERSATION_UPDATE` decoupling for sidebar previews.
4. **Users**: Manages user profiles, Upstash Redis + in-memory dual-write presence, and search/discovery.

For detailed information on each module, please view the respective markdown files inside the `public-docs/modules/` directory.
