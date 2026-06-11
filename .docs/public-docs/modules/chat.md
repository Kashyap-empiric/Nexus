# Chat Module

## Overview

The Chat module provides the core real-time messaging UI on the frontend. It includes message display, sending, editing, deletion, and conversation management. The module integrates deeply with Socket.io for real-time delivery and TanStack Query for server state management.

## Client-Side (`client/src/modules/chat`)

### Architecture

```
chat/
├── api/
│   ├── conversations.api.ts     # REST API calls (list, create, read receipts)
│   ├── messages.api.ts          # REST API calls (get, create, edit, delete)
│   └── invites.api.ts           # Invite generation API
├── components/
│   ├── ActiveConversation.tsx    # Main chat view orchestrator
│   ├── EmptyState.tsx           # Shown when no conversation selected
│   ├── InviteModal.tsx          # Invite link generation modal
│   ├── InviteProcessor.tsx      # Client-side invite resolution
│   ├── MessageGroupItem.tsx     # Renders a group of messages from one user
│   ├── MessageInput.tsx         # Text input + send button
│   ├── MessageList.tsx          # Paginated message list container
│   ├── MessageListSkeleton.tsx  # Loading skeleton
│   ├── MessageStatus.tsx        # Pending/sent/read status icon
│   ├── NavigationRail.tsx       # App-level navigation
│   ├── NewConversationModal.tsx # User search + DM creation
│   ├── PresenceIndicator.tsx    # Green/gray online dot
│   └── Sidebar.tsx              # Conversation list with search
├── hooks/
│   ├── useConversationSocket.ts # Socket listeners for active conversation
│   ├── useConversations.ts      # TanStack Query hooks for conversation data
│   ├── useGlobalSocket.ts       # Socket listeners for sidebar/cross-cutting events
│   └── useMessages.ts           # TanStack Query hooks + mutation hooks for messages
├── realtime/
│   ├── index.ts                 # Event router factory (createChatEventRouter)
│   ├── conversation.handlers.ts # Message read, conversation new/update handlers
│   └── message.handlers.ts      # Message new handler (unread count + tab badge)
├── store/
│   └── chatStore.ts             # Zustand store (socket status, online users, drafts)
├── types/
│   ├── conversation.ts          # Conversation, ConversationMember, User interfaces
│   ├── message.ts               # Message, MessagePage interfaces
│   └── socket.ts                # Socket payload interfaces (SocketResponse, MessageSendPayload, etc.)
└── utils/
    ├── cacheHelpers.ts          # updateMessageInCache, markMessageDeletedInCache
    └── groupMessages.ts         # Groups messages by user + 1-minute window
```

### Real-time Integration

The chat module uses Socket.io for all real-time events. There are two parallel hook sets:

1. **`useGlobalSocket`** — Mounted once at the app level. Handles sidebar-level events:
   - `message:new` — Increments unread count for the relevant conversation
   - `message:read` — Updates read receipt state in sidebar cache
   - `conversation:new` — Prepends new conversation to sidebar list
   - `conversation:update` — Updates conversation metadata (latestMessage, updatedAt) and re-sorts sidebar

2. **`useConversationSocket`** — Mounted per active conversation. Handles conversation-scoped events:
   - `message:new` — Appends new messages or replaces optimistic (pending) messages
   - `message:read` — Updates `lastReadMessageId` in conversation cache
   - `message:update` — Updates edited message content in cache
   - `message:delete` — Marks message as deleted in cache

### State Management

- **TanStack Query** manages server state (conversations list, conversation details, message pages)
- **Zustand** manages UI state (socket status, online users set, drafts map, active conversation ID)
- Optimistic updates use a `tempId` strategy: messages are created with a temporary ID that gets replaced with the server-returned ID on acknowledgment

### Key Patterns

- Message history is fetched via cursor-based pagination using UUIDv7 IDs
- Messages are grouped chronologically by user + 1-minute window (see `groupMessages.ts`)
- The server strictly owns conversation metadata — the client never infers `latestMessage` or `updatedAt` from message payloads

### Recent Updates

- feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
- feat(ui): Added proper responsiveness to the UI and improved the message list behaviour.
- feat(ui): Added Emoji Picker (`emoji-picker-react`) to MessageInput with `Smile` icon button, dark/light theme support.
- feat(invites): Added invite link generation for DMs — `InviteModal`, `useInviteLink` hook, `useInviteModal` shared hook, sidebar integration.
- fix(ui): Added unread badge to mobile back button in ActiveConversation for navigation context.
- fix(ui): Dynamic textarea heights with 140px max, mobile-aware keyboard handling (Enter → new line on mobile, send on desktop).
- fix(ui): Various UI inconsistency fixes and accessibility improvements.
- chore: Code deduplication refactors across the codebase.
