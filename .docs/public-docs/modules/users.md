# Users Module

## Overview

The Users module handles user profiles, search/discovery, and presence (online/offline) status. User presence is driven entirely by Socket.io real-time events.

## Server-Side (`server/src/modules/users`)

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Yes | List all registered users |
| `GET` | `/api/users/search?q=` | Yes | Search users by username/email |
| `GET` | `/api/me` | Yes | Current authenticated user (defined in `app.ts`) |

### Files

| File | Role |
|---|---|
| `users.controller.ts` | Request handlers |
| `users.routes.ts` | Route definitions |
| `users.service.ts` | Business logic |
| `users.schema.ts` | Zod validation |

## Client-Side (`client/src/modules/users`)

### Key Files

| File | Role |
|---|---|
| `api/users.api.ts` | REST API calls for user search/list |
| `hooks/useUsers.ts` | TanStack Query hook for user search |
| `hooks/usePresence.ts` | Reserved for future presence hook |

### Presence Integration

User presence is managed through a cross-module integration:

| Component | Location | Role |
|---|---|---|
| `SocketProvider.tsx` | `client/src/shared/providers/socket-provider.tsx` | Registers `presence:initial`, `user:online`, `user:offline` listeners on the global socket |
| `useChatStore` | `client/src/modules/chat/store/chatStore.ts` | Zustand store holding `onlineUsers: Set<string>` with actions: `setInitialOnlineUsers`, `addUserOnline`, `removeUserOffline` |
| `PresenceIndicator.tsx` | `client/src/modules/chat/components/PresenceIndicator.tsx` | Renders a green dot (online) or gray dot (offline) based on `onlineUsers.has(userId)` |

### Presence Data Flow

1. User connects → server sends `presence:initial { userIds: [...] }` → `SocketProvider` calls `setInitialOnlineUsers()`
2. Another user comes online → server broadcasts `user:online { userId }` → `SocketProvider` calls `addUserOnline()`
3. Another user goes offline → server broadcasts `user:offline { userId }` → `SocketProvider` calls `removeUserOffline()`
4. UI components read from `useChatStore(state => state.onlineUsers)` to show presence dots

### Recent Updates

- feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
