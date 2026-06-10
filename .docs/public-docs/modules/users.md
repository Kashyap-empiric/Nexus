# Users Module

## Overview
The Users module handles profiles, presence status (online/offline), and user search capabilities.

## Client-Side (`client/src/modules/users`)
- **UI Components**: Displays user avatars, profile settings, and directories of other users.
- **State**: Tracks which users are currently online via Socket.io events.

## Server-Side (`server/src/modules/users`)
- **Endpoints**: Provides REST APIs for creating accounts, fetching user profiles, and updating settings.
- **Database**: Interacts with the `User` table/collection in the database via Prisma.


**Recent Updates:**
- feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
