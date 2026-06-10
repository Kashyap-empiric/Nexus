# Nexus Documentation

Welcome to the main documentation for the Nexus project. This directory (`public-docs/`) contains all the necessary architectural overviews, module descriptions, and file structure definitions needed to understand the application.

## Overview

Nexus is a full-stack communication platform consisting of a Node.js backend (`server/`) and a React-based frontend (`client/`). The system relies heavily on a modular architecture where each feature is compartmentalized into its own module containing both the UI elements (on the client) and the business logic/API routes (on the server).

## Key Resources

- **[File Structure](./file-structure.md)**: A high-level view of the repository's directory layout.
- **[Client Modules](./modules/)**: Documentation outlining the frontend modules like Auth, Chat, etc.
- **[Server Modules](./modules/)**: Documentation for the backend domain logic.

## Modules Summary

The application is broken down into specific domains. Each domain generally has a representation on both the client and the server:

1. **Auth**: Handles user authentication, registration, login, and session persistence.
2. **Chat / Messages**: The core communication feature. Handles message delivery, real-time socket connections, and UI rendering of chat history.
3. **Conversations**: Manages the containers for messages (e.g., one-on-one chats, group channels).
4. **Users**: Manages user profiles, online presence, and search/discovery of other users.

For detailed information on each module, please view the respective markdown files inside the `public-docs/modules/` directory.
