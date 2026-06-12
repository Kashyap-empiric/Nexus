# Chat Module

## Overview

The Chat module is the orchestrator for the core chat experience. It coordinates between the conversations, messages, and workspace modules, manages the active conversation state, and hosts the main chat UI components. It contains what remains after extracting `workspaces/`, `invites/`, `conversations/`, and `messages/` into their own modules.

## Client-Side (`client/src/modules/chat`)

### Components

| Component | Role |
|-----------|------|
| `ActiveConversation.tsx` | Main orchestrator — loads conversation details, renders MessageList + MessageInput + header |
| `NavigationRail.tsx` | Left-side app navigation — DM icon, workspace icons, create workspace button |
| `PresenceIndicator.tsx` | Green/gray online dot for user avatars |

### Hooks

| Hook | Role |
|------|------|
| `useConversationSocket.ts` | Socket event listeners for the active conversation (`message:new`, `message:read`, `message:update`, `message:delete`) |
| `useGlobalSocket.ts` | Global socket listeners for sidebar-level events (read receipts, new conversations, conversation updates) |
| `useMessageScroll.ts` | Scroll behavior management for MessageList (auto-scroll, jump-to-bottom, infinite scroll) |

### Store

| Store | Role |
|-------|------|
| `useChatStore` | Zustand store — `mode` (DM/WORKSPACE), `activeWorkspaceId`, `lastVisitedChannels`, `drafts` |

### Utils

| File | Role |
|------|------|
| `groupMessages.ts` | Groups messages by user + 1-minute window for compact display |

### Real-time Integration

The chat module uses Socket.io for all real-time events:

1. **`useGlobalSocket`** — Mounted in the Sidebar. Handles cross-conversation events:
   - `message:new` — Increments unread count
   - `message:read` — Updates read receipt state
   - `conversation:new` — Prepends new conversation to sidebar
   - `conversation:update` — Updates sidebar metadata + re-sorts

2. **`useConversationSocket`** — Mounted per active conversation. Handles conversation-scoped events:
   - `message:new` — Appends new messages or replaces optimistic ones
   - `message:read` — Updates `lastReadMessageId` in cache
   - `message:update` / `message:delete` — Updates/deletes message in cache

### Key Patterns

- **Mode-based rendering**: `chatStore.mode` determines if the sidebar shows DMs or workspace channels
- **Workspace routing**: When in WORKSPACE mode, channel clicks navigate to `/workspaces/{slug}/channels/{id}`
- **Unread badge on mobile back button**: Shows total unread across all other conversations
