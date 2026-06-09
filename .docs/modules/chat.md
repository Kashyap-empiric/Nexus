# Chat Module (Conversations & Messages)

> **Last Updated:** 2026-06-09
> **Location:** `client/src/modules/chat/`, `server/src/modules/conversations/`, `server/src/modules/messages/`
> **Status:** ✅ Active

The chat module forms the backbone of the Nexus direct messaging system. It handles creating private DMs between users, paginated message fetching, message creation, read receipts, and presence indicators. It utilizes a hybrid approach: REST for fetching history/metadata, and WebSockets (`socket.io`) for real-time message delivery and optimistic UI updates.

## Core Features

- **Direct Messages (DMs)**: Allows any two users to start a private 1-on-1 conversation. `dmPair` unique constraint prevents duplicate DMs.
- **Cursor-based Pagination**: Messages are fetched using cursor-based pagination.
- **Read Receipts**: Users can mark conversations as read, providing a reliable persistent state for unread indicators. Broadcast via `message:read` socket event.
- **Real-time Delivery**: Messages delivered instantly via Socket.io rooms with optimistic UI (tempId swapping).
- **Presence Indicators**: Green/gray online status dots via `PresenceIndicator` component, backed by Redis.
- **Message Editing** (🟡 infrastructure): `editMessage` service with validation exists but no REST endpoint yet.
- **Message Soft-Delete** (🟡 infrastructure): `deletedAt` field on Message schema + migration applied, no API endpoint yet.

## Database Schema

The Chat module interacts with three core Prisma models:

1. **`Conversation`**: The container for a chat. For Phase 1, only `DM` types are supported. Has `updatedAt` field updated on every new message for sidebar ordering.
2. **`ConversationMember`**: The pivot table linking a `User` to a `Conversation`. This table also holds the `lastReadMessageId` for each user.
3. **`Message`**: Individual messages containing the content, sender ID, and timestamp. All message IDs are strictly generated using **UUIDv7** to ensure monotonically increasing primary keys. Has `isEdited` flag and `deletedAt` for soft-delete.

## REST Endpoints

### Conversations
- `GET /api/conversations`: Returns all conversations the authenticated user is a member of. Includes the latest message for preview. Joined through `ConversationMember`.
- `GET /api/conversations/:id`: Fetches detailed metadata about a specific conversation and its members.
- `POST /api/conversations`: Creates a new DM with a `targetUserId`. If a DM already exists, it returns the existing one via `dmPair` unique constraint. ✅ Dynamically joins participant sockets to new room + emits `conversation:new`.
- `PATCH /api/conversations/:id/read`: Updates the user's `lastReadMessageId` for a specific conversation. ✅ Broadcasts `message:read` to room after DB update.

### Messages
- `GET /api/conversations/:id/messages?cursor=<uuid>&limit=50`: Fetches messages for a conversation. Uses cursor-based pagination (cursor = message `id`, fetches `limit + 1`, trims last to determine `hasMore`). ⚠️ Currently orders by `createdAt: "desc"` instead of `id`.
- `POST /api/conversations/:id/messages`: Fallback REST endpoint to create a new message. ✅ Broadcasts `message:new` to socket room after DB persistence. The primary method is emitting `message:send` Socket.io event.

### Users
- `GET /api/users`: Returns list of registered users for DM creation search/suggestions.

## Socket Integration

### Client-Side Hooks
- **`useMessages.ts`**: `useSendMessageMutation` with full optimistic update lifecycle:
  - `onMutate`: Cancels in-flight queries, injects optimistic message with `pending: true`, updates sidebar ordering optimistically.
  - `onSuccess`: Replaces optimistic message (matched by tempId) with real server message.
  - `onError`: Restores previous cache snapshot, shows error toast (rate limit errors get styled red toast with AlertTriangle icon).
- **`useConversationSocket.ts`**: Injects `message:new` into paginated cache, updates `message:read` receipt in both conversation list and single conversation caches.
- **`useGlobalSocket.ts`**: Handles cross-conversation updates for sidebar reordering, unread badges, and new conversation notification.
- **`usePresence.ts`**: Listens for presence events, updates Zustand store.

### Event Router Pattern
The `realtime/` directory contains decoupled event handler factories:
- `message.handlers.ts`: `handleMessageNew` — updates conversations list cache, sets tab badge on hidden tab.
- `conversation.handlers.ts`: `handleMessageRead` — updates `lastReadMessageId` on conversation members.
- `index.ts`: `createChatEventRouter` — factory that creates router object from queryClient.

## Read Receipts Architecture

The read receipt system minimizes API noise while maintaining a reliable persistent state.

### Backend Validations
The `PATCH /api/conversations/:id/read` endpoint enforces strict validation:
1. Validates the `messageId` format using Zod (`markReadSchema`).
2. Queries the `Message` table to ensure the message physically exists.
3. Verifies that the `message.conversationId` exactly matches the URL parameter.
4. Executes a Prisma update on `ConversationMember` targeting the `@@unique([conversationId, userId])` compound index.
5. Broadcasts `message:read` to the socket room.

### Frontend Integration
Read receipts are triggered by a focused `useEffect` inside `MessageList.tsx`. A `useRef` acts as a guard to prevent rapid-fire API spam during pagination or re-renders.

```tsx
  const { mutate: markRead } = useMarkConversationReadMutation();
  const hasMarkedReadFor = useRef<string | null>(null);

  useEffect(() => {
    if (!latestMessageId || hasMarkedReadFor.current === conversationId) return;
    markRead({ conversationId, messageId: latestMessageId });
    hasMarkedReadFor.current = conversationId;
  }, [conversationId, latestMessageId, markRead]);
```

### MessageStatus Component
The `MessageStatus` component renders:
- `Clock` icon — when `isPending: true` (optimistic state)
- `Check` icon — when message is sent but not yet read
- `CheckCheck` icon (blue) — when `messageId <= partnerLastReadMessageId`

## Presence Integration

The chat module integrates presence via:
- **`chatStore.onlineUsers`**: `Set<string>` of currently online user IDs, updated by `usePresence` hook.
- **`PresenceIndicator`**: Renders a green dot (bg-green-500) when `onlineUsers.has(userId)`, gray dot otherwise. Positioned absolutely at bottom-right of avatar.
- **`Sidebar`**: Shows presence indicator next to conversation partner's avatar.

## Known Issues
- Cursor pagination orders by `createdAt` instead of `id` — should use UUIDv7 monotonic ordering
- Soft-deleted messages not filtered in `getMessages` — needs `deletedAt: null` clause
- No API endpoint for message editing (service exists)
- No API endpoint for message deletion (schema + migration done)
