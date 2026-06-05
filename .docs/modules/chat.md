# Chat Module (Conversations & Messages)

The chat module forms the backbone of the Nexus direct messaging system. It handles creating private DMs between users, paginated message fetching, message creation, and read receipts. Currently, it operates exclusively via REST endpoints, with real-time WebSocket augmentation planned for Day 3.

## Core Features

- **Direct Messages (DMs)**: Allows any two users to start a private 1-on-1 conversation.
- **Cursor-based Pagination**: Messages are fetched using high-performance cursor pagination backed by UUIDv7 identifiers.
- **Read Receipts**: Users can mark conversations as read, providing a reliable persistent state for unread indicators.

## Database Schema

The Chat module interacts with three core Prisma models:

1. **`Conversation`**: The container for a chat. For Phase 1, only `DM` types are supported.
2. **`ConversationMember`**: The pivot table linking a `User` to a `Conversation`. This table also holds the `lastReadMessageId` for each user.
3. **`Message`**: Individual messages containing the content, sender ID, and timestamp. All message IDs are strictly generated using **UUIDv7** to ensure monotonically increasing primary keys for seamless cursor pagination.

## REST Endpoints

### Conversations
- `GET /api/conversations`: Returns all conversations the authenticated user is a member of. Includes the latest message for preview.
- `GET /api/conversations/:id`: Fetches detailed metadata about a specific conversation and its members.
- `POST /api/conversations`: Creates a new DM with a `targetUserId`. If a DM already exists, it returns the existing one via a unique `dmPair` constraint check.
- `PATCH /api/conversations/:id/read`: Updates the user's `lastReadMessageId` for a specific conversation.

### Messages
- `GET /api/conversations/:id/messages?cursor=<uuid>&limit=50`: Fetches messages for a conversation. If `cursor` is omitted, fetches the newest messages.
- `POST /api/conversations/:id/messages`: Creates a new message. Emits real-time Socket.io events (post Day 3).

## Read Receipts Architecture

The read receipt system was designed to minimize API noise while maintaining a reliable persistent state.

### Backend Validations
The `PATCH /api/conversations/:id/read` endpoint enforces strict validation:
1. Validates the `messageId` format using Zod (`markReadSchema`).
2. Queries the `Message` table to ensure the message physically exists.
3. Verifies that the `message.conversationId` exactly matches the URL parameter.
4. Executes a Prisma update on `ConversationMember` targeting the `@@unique([conversationId, userId])` compound index.

### Frontend Integration
On the client side, read receipts are triggered by a focused `useEffect` inside `MessageList.tsx`. To prevent rapid-fire API spam when paginating or when the conversation renders multiple times, a `useRef` acts as a guard.

```tsx
  const { mutate: markRead } = useMarkConversationReadMutation();
  const hasMarkedReadFor = useRef<string | null>(null);

  useEffect(() => {
    // Only fire if we have a valid latest message and haven't already marked this conversation
    if (!latestMessageId || hasMarkedReadFor.current === conversationId) return;

    markRead({
      conversationId,
      messageId: latestMessageId,
    });
    
    // Lock the trigger for this conversation instance
    hasMarkedReadFor.current = conversationId;
  }, [conversationId, latestMessageId, markRead]);
```

## Future Upgrades
- Optimistic updates when sending messages (Day 3).
- Real-time Socket.io broadcasting of `READ_RECEIPT` events to instantly update UI ticks.
- Scroll-to-bottom improvements and "unread message" dividers.
