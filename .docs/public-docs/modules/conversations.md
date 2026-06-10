# Conversations Module

## Overview
The Conversations module manages the logical containers for messages. A conversation can be a one-on-one direct message or a multi-user group chat.

## Server-Side (`server/src/modules/conversations`)
- **Endpoints**: APIs to create a new conversation, fetch all conversations for the logged-in user, and update conversation metadata.
- **Database**: Manages the junction between users and the conversations they belong to, ensuring proper access control.


**Recent Updates:**
- feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
