# Users Module

## Overview

The Users module handles user profiles, search/discovery, profile editing, and presence (online/offline) status. User presence is driven entirely by Socket.io real-time events.

## Server-Side (`server/src/modules/users`)

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/search?q=` | Yes | Search users by username/email |
| `GET` | `/api/users/me` | Yes | Get own full profile (username, displayName, avatarUrl, email, preferences) |
| `PATCH` | `/api/users/me` | Yes | Update own profile (username, displayName, avatarUrl, isOnboarded) |

### Files

| File | Role |
|---|---|
| `users.controller.ts` | Request handlers for search, getMyProfile, updateProfile |
| `users.routes.ts` | Route definitions |
| `users.service.ts` | Business logic for search, profile CRUD |
| `users.schema.ts` | Zod validation for search query and update profile body |
| `users.repository.ts` | Prisma queries: searchUsers, findUserById, updateUser, findUserByUsername, findUserByEmail |

### Search

- Searches by username AND email (case-insensitive, `mode: "insensitive"`)
- Excludes the current user from results
- Returns `id`, `username`, `email`, `avatarUrl`
- Limited to 10 results

### Profile Management

- `getMyProfile` returns full user record including notification preferences
- `updateProfile` supports partial updates (username, displayName, avatarUrl, isOnboarded)
- Profile updates go through Prisma; unique constraint handles username conflicts

## Client-Side (`client/src/modules/users`)

### Key Files

| File | Role |
|---|---|
| `api/users.api.ts` | REST API calls for user search/list and profile management |
| `hooks/useUsers.ts` | TanStack Query hook for user search |
| `hooks/useProfile.ts` | TanStack Query hooks for getMyProfile + updateProfile mutation |
| `hooks/usePresence.ts` | Reserved for future presence hook |

### Profile & Settings Integration

Profile settings are managed through the `SharedSettingsModal` (in `modules/settings/`):
- **ProfileSettings**: Form with username, displayName, avatarUrl fields using react-hook-form + zod
- Uses `useProfile` hook to load current data and `useUpdateProfile` for mutations
- Loading skeleton states while data is being fetched

### Presence Integration

User presence is managed through a cross-module integration:

| Component | Location | Role |
|---|---|---|
| `SocketProvider.tsx` | `client/src/socket/socketProvider.tsx` | Registers `presence:initial`, `user:online`, `user:offline` listeners |
| `useChatStore` | `client/src/modules/chat/store/chatStore.ts` | Zustand store holding `onlineUsers: Set<string>` |
| `PresenceIndicator.tsx` | `client/src/modules/chat/components/PresenceIndicator.tsx` | Renders green/gray dot based on online status |

### Presence Data Flow

1. User connects → server sends `presence:initial { userIds: [...] }` → `SocketProvider` calls `setInitialOnlineUsers()`
2. Another user comes online → server broadcasts `user:online { userId }` → `SocketProvider` calls `addUserOnline()`
3. Another user goes offline → server broadcasts `user:offline { userId }` → `SocketProvider` calls `removeUserOffline()`
4. UI components read from `useChatStore(state => state.onlineUsers)` to show presence dots
