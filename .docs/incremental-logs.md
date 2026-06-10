# Incremental Logs

> This file is the most detailed source of progress logs. Add detailed logs for every meaningful change made to the project here.

## 10th June 2026 - Documentation System Setup

- **Action**: Established the documentation structure and standard guidelines for agents.
- **Details**: 
  - Updated `.agents/00-instructions.md` with new `Documentation Rules`.
  - Created `.docs/major-changes.md` to track significant architectural shifts and the reasoning behind them.
  - Initialized the `public-docs/` directory to serve as the main documentation portal for the project.
  - Set up `public-docs/DOCUMENTATION.md` and module-specific documentation.
  - Standardized the use of `incremental-logs.md` as the most granular log file for all tasks.
- **Files Touched**:
  - `.agents/00-instructions.md`
  - `.docs/incremental-logs.md`
  - `.docs/major-changes.md`
  - `public-docs/DOCUMENTATION.md`
  - `public-docs/file-structure.md`
  - `public-docs/modules/*.md`

## 10th June 2026 - Real-time Conversation Metadata & Presence Fix

- **Action**: Implemented the `CONVERSATION_UPDATE` socket event architecture, fixed a presence race condition, and added sidebar conversation search.
- **Details**:
  - Refactored `messages.service.ts` to return `conversationMetadata` natively inside transactions to avoid extra database queries.
  - Introduced `CONVERSATION_UPDATE` to handle `latestMessage`, `updatedAt`, and `latestMessageId` independently of message payloads.
  - Stripped conversation mutation logic from client-side `message.handlers.ts` and `cacheHelpers.ts`.
  - Moved socket presence listeners (`INITIAL_PRESENCE`, etc.) directly into `SocketProvider.tsx` to fix a race condition where the connection happened before listeners were attached.
  - Implemented a local filter for the sidebar search bar.
- **Files Touched**:
  - `server/src/modules/messages/messages.service.ts`
  - `server/src/modules/messages/messages.controller.ts`
  - `server/src/socket/handlers/message.handler.ts`
  - `client/src/shared/socket-events.ts`
  - `client/src/modules/chat/realtime/conversation.handlers.ts`
  - `client/src/modules/chat/realtime/message.handlers.ts`
  - `client/src/modules/chat/utils/cacheHelpers.ts`
  - `client/src/shared/providers/socket-provider.tsx`
  - `client/src/modules/chat/components/Sidebar.tsx`
