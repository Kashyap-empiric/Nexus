# Nexus — API Reference

> **Last Updated:** 2026-06-29
> **Purpose:** Complete OpenAPI-style reference for all REST endpoints and Socket.io events.

---

## Base URL

- **Development**: `http://localhost:4000/api`
- **Production**: Render-hosted URL (TBD)

## Authentication

All endpoints (unless noted) require:
- **Header**: `Authorization: Bearer <supabase_jwt>`
- **Validation**: JWKS-based, verified locally (zero network calls)
- **Failure response**: `401 { "error": "Unauthorized" }`

## Common Response Format

```json
// Success
{ "data": <resource>, "pagination?": { "nextCursor": "string" } }

// Error
{ "error": "Human-readable error message" }
```

---

## Conversations

### List Conversations

Returns the user's sidebar — all DMs and channel memberships, ordered by `updatedAt` descending.

```
GET /api/conversations
```

**Auth**: ✅ Required

**Response** `200`:
```json
[
  {
    "id": "uuidv7",
    "type": "DM | CHANNEL",
    "name": "string | null",
    "description": "string | null",
    "workspaceId": "uuidv7 | null",
    "visibility": "PUBLIC | PRIVATE",
    "latestMessage": {
      "id": "uuidv7",
      "content": "string",
      "userId": "uuidv7",
      "deletedAt": "iso8601 | null",
      "createdAt": "iso8601",
      "user": { "username": "string", "fullName": "string | null" }
    },
    "updatedAt": "iso8601"
  }
]
```

### Create Conversation (DM)

Idempotent — returns existing conversation if `dmPair` already exists.

```
POST /api/conversations
```

**Auth**: ✅ Required

**Request**:
```json
{
  "userId": "uuidv7",
  "type": "DM"
}
```

**Response** `201`:
```json
{
  "id": "uuidv7",
  "type": "DM",
  "dmPair": "sorted:user:id:pair",
  "members": [{ "userId": "uuidv7" }]
}
```

### Get Conversation Details

```
GET /api/conversations/:id
```

**Auth**: ✅ Required + Membership check

**Response** `200`:
```json
{
  "id": "uuidv7",
  "type": "DM | CHANNEL",
  "name": "string | null",
  "members": [{
    "userId": "uuidv7",
    "lastReadMessageId": "uuidv7 | null",
    "user": { "id": "uuidv7", "username": "string", "avatarUrl": "string | null" }
  }]
}
```

### Mark Conversation as Read

```
PATCH /api/conversations/:id/read
```

**Auth**: ✅ Required + Membership check

**Request**:
```json
{
  "lastReadMessageId": "uuidv7"
}
```

**Response** `200`:
```json
{ "success": true }
```

---

## Messages

### Get Messages (Cursor Pagination)

```
GET /api/conversations/:id/messages?cursor=<messageId>&limit=50
```

**Auth**: ✅ Required + Conversation member

**Query Params**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string (UUIDv7) | — | Load messages older than this ID |
| `limit` | number | 50 | Page size (max 100) |

**Response** `200`:
```json
{
  "messages": [
    {
      "id": "uuidv7",
      "content": "string",
      "conversationId": "uuidv7",
      "userId": "uuidv7",
      "isEdited": false,
      "deletedAt": null,
      "replyToId": "uuidv7 | null",
      "threadRootId": "uuidv7 | null",
      "threadReplyCount": 0,
      "lastThreadReplyAt": "iso8601 | null",
      "isThreadBroadcast": false,
      "createdAt": "iso8601",
      "user": { "username": "string", "avatarUrl": "string | null" }
    }
  ],
  "pinnedMessageIds": ["uuidv7"],
  "nextCursor": "uuidv7 | null"
}
```

**Errors**: `401` (unauthenticated), `403` (not a member), `404` (conversation not found)

### Send Message

```
POST /api/conversations/:id/messages
```

**Auth**: ✅ Required + Conversation member

**Rate Limit**: 20 requests per 60-second window per user

**Request**:
```json
{
  "content": "Hello, world!",
  "replyToId": "uuidv7 | optional",
  "threadRootId": "uuidv7 | optional",
  "isThreadBroadcast": false
}
```

**Response** `201`:
```json
{
  "id": "uuidv7",
  "content": "Hello, world!",
  "conversationId": "uuidv7",
  "userId": "uuidv7",
  "threadRootId": "uuidv7 | null",
  "threadReplyCount": 0,
  "createdAt": "iso8601"
}
```

### Edit Message

```
PATCH /api/conversations/:id/messages/:messageId
```

**Auth**: ✅ Required + Must be message author

**Request**:
```json
{
  "content": "Updated content"
}
```

**Response** `200`:
```json
{
  "id": "uuidv7",
  "content": "Updated content",
  "isEdited": true,
  "updatedAt": "iso8601"
}
```

### Delete Message (Soft)

```
DELETE /api/conversations/:id/messages/:messageId
```

**Auth**: ✅ Required + Must be message author

**Response** `200`:
```json
{ "success": true }
```

**Behavior**: Sets `deletedAt` to current timestamp. Message is excluded from all queries but not removed from the database.

### Search Messages

```
GET /api/messages/search?q=<query>
```

**Auth**: ✅ Required

**Response** `200`:
```json
{
  "messages": [
    {
      "id": "uuidv7",
      "content": "string",
      "conversationId": "uuidv7",
      "userId": "uuidv7",
      "createdAt": "iso8601",
      "conversation": { "id": "uuidv7", "name": "string | null", "type": "DM | CHANNEL" },
      "user": { "username": "string", "avatarUrl": "string | null" }
    }
  ]
}
```

**Note**: Uses `contains` (LIKE `%query%`). No full-text index — will degrade at 50K+ messages.

### Get Thread Messages

```
GET /api/messages/thread/:rootId?cursor=<messageId>&limit=50
```

**Auth**: ✅ Required + Must be member of parent conversation

**Query Params**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string (UUIDv7) | — | Load replies older than this ID |
| `limit` | number | 50 | Page size (max 100) |

**Response** `200`:
```json
{
  "messages": [
    {
      "id": "uuidv7",
      "content": "string",
      "userId": "uuidv7",
      "threadRootId": "uuidv7",
      "createdAt": "iso8601",
      "user": { "username": "string", "avatarUrl": "string | null" }
    }
  ],
  "rootMessage": { /* full Message object of thread root */ },
  "nextCursor": "uuidv7 | null"
}
```

### Pin Message

```
POST /api/conversations/:id/pins/:messageId
```

**Auth**: ✅ Required + Conversation member

**Response** `201`: `{ "success": true }`

### Unpin Message

```
DELETE /api/conversations/:id/pins/:messageId
```

**Auth**: ✅ Required + Conversation member

**Response** `200`: `{ "success": true }`

### List Pinned Messages

```
GET /api/conversations/:id/pins
```

**Auth**: ✅ Required + Conversation member

**Response** `200`:
```json
{
  "pins": [
    {
      "id": "cuid",
      "messageId": "uuidv7",
      "conversationId": "uuidv7",
      "pinnedBy": "uuidv7",
      "pinnedByUsername": "string",
      "message": { /* full Message object */ },
      "createdAt": "iso8601"
    }
  ]
}
```

---

## Workspaces

### List Workspaces

```
GET /api/workspaces
```

**Auth**: ✅ Required

**Response** `200`:
```json
[
  {
    "id": "uuidv7",
    "name": "string",
    "slug": "string",
    "description": "string | null",
    "imageUrl": "string | null",
    "role": "OWNER | ADMIN | MEMBER",
    "memberCount": 5
  }
]
```

### Create Workspace

```
POST /api/workspaces
```

**Auth**: ✅ Required

**Request**:
```json
{
  "name": "My Workspace",
  "slug": "my-workspace",
  "description": "optional description"
}
```

**Response** `201`:
```json
{
  "id": "uuidv7",
  "name": "My Workspace",
  "slug": "my-workspace",
  "role": "OWNER"
}
```

**Behavior**: Creator is assigned `OWNER` role. A `#general` channel is auto-created.

### Get Workspace Details

```
GET /api/workspaces/:id
```

**Auth**: ✅ Required + Workspace member

**Response** `200`:
```json
{
  "workspace": { "id": "uuidv7", "name": "string", "slug": "string" },
  "channels": [
    { "id": "uuidv7", "name": "string", "type": "CHANNEL", "visibility": "PUBLIC | PRIVATE" }
  ]
}
```

### Update Workspace

```
PATCH /api/workspaces/:id
```

**Auth**: ✅ Required + Workspace admin or owner

**Request**:
```json
{
  "name": "string (optional)",
  "slug": "string (optional)",
  "description": "string (optional)",
  "iconPath": "string (optional)"
}
```

**Response** `200`: Updated workspace object

### Delete Workspace

```
DELETE /api/workspaces/:id
```

**Auth**: ✅ Required + Workspace owner only

**Response** `200`: `{ "success": true, "name": "deleted workspace name" }`

**Behavior**: Cascading delete — removes all channels, messages, memberships.

### Leave Workspace

```
POST /api/workspaces/:id/leave
```

**Auth**: ✅ Required + Workspace member (not owner)

**Response** `200`: `{ "success": true }`

---

## Channels

### Create Channel

```
POST /api/workspaces/:id/channels
```

**Auth**: ✅ Required + Workspace member

**Request**:
```json
{
  "name": "#channel-name",
  "description": "optional",
  "visibility": "PUBLIC | PRIVATE"
}
```

**Response** `201`:
```json
{
  "id": "uuidv7",
  "name": "channel-name",
  "type": "CHANNEL",
  "visibility": "PUBLIC"
}
```

**Behavior**: PUBLIC channels auto-join all workspace members. PRIVATE channels require explicit member addition.

### Update Channel

```
PATCH /api/workspaces/:id/channels/:channelId
```

**Auth**: ✅ Required + Workspace admin or owner

**Request**: `{ "name": "string", "description": "string", "visibility": "PUBLIC | PRIVATE" }`

### Delete Channel

```
DELETE /api/workspaces/:id/channels/:channelId
```

**Auth**: ✅ Required + Workspace admin or owner

**Behavior**: Cascade deletes all messages in the channel.

### List Channel Members

```
GET /api/workspaces/:id/channels/:channelId/members
```

### Add Channel Members

```
POST /api/workspaces/:id/channels/:channelId/members
```

**Request**: `{ "userIds": ["uuidv7"] }`

**Behavior**: Members are socket-joined to the channel room dynamically.

### Remove Channel Member

```
DELETE /api/workspaces/:id/channels/:channelId/members/:userId
```

---

## Users

### Get Current User

```
GET /api/users/me
```

**Auth**: ✅ Required

**Response** `200`: Full user profile (email, username, avatarUrl, bio, status, etc.)

### Update Profile

```
PATCH /api/users/me
```

**Request**: `{ "username": "string", "fullName": "string | null", "bio": "string | null" }`

### Update Avatar

```
PATCH /api/users/me/avatar
```

**Request**: `{ "avatarUrl": "string | null" }`

### Update Status

```
PATCH /api/users/me/status
```

**Request**: `{ "status": "AVAILABLE | AWAY | DND | INVISIBLE", "statusText": "string | null" }`

### Search Users

```
GET /api/users/search?q=<query>
```

### Check Username

```
GET /api/users/check-username?username=<value>
```

**Auth**: ❌ Not required

**Response** `200`: `{ "available": true | false }`

### Get Public Profile

```
GET /api/users/:id
```

---

## Notifications

### List Notifications

```
GET /api/notifications?cursor=<id>&limit=20
```

**Auth**: ✅ Required

### Get Unread Count

```
GET /api/notifications/unread-count
```

**Response**: `{ "count": 5 }`

### Mark as Read

```
PATCH /api/notifications/:id/read
```

### Mark All as Read

```
PATCH /api/notifications/read-all
```

### Subscribe to Push

```
POST /api/notifications/push/subscribe
```

**Request**:
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "base64-encoded-key",
  "auth": "base64-encoded-auth-secret"
}
```

### Unsubscribe from Push

```
DELETE /api/notifications/push/subscribe
```

**Body**: `{ "endpoint": "string" }`

### Get Preferences

```
GET /api/notifications/preferences
```

**Response** `200`:
```json
{
  "pushEnabled": true,
  "dmNotifications": true,
  "channelNotifications": false,
  "mentionNotifications": true,
  "threadNotifications": true,
  "inviteNotifications": true,
  "workspaceActivityNotifications": true,
  "replyNotifications": true
}
```

### Update Preferences

```
PUT /api/notifications/preferences
```

**Request**: `{ "pushEnabled": boolean, "dmMentions": boolean, "channelNotifications": boolean, "threadNotifications": boolean }`

---

## Thread Participants

### Follow Thread

Subscribe the current user to a thread with default ALL notification level.

```
POST /api/conversations/:id/messages/:messageId/thread/follow
```

**Auth**: ✅ Required + Conversation member

**Response** `201`: `{ "success": true }`

### Unfollow Thread

Unsubscribe the current user from a thread (still receives notifications if mentioned).

```
DELETE /api/conversations/:id/messages/:messageId/thread/follow
```

**Auth**: ✅ Required + Conversation member

**Response** `200`: `{ "success": true }`

### Update Thread Notification Level

Change notification level for the current user on a specific thread.

```
PATCH /api/conversations/:id/messages/:messageId/thread/notifications
```

**Auth**: ✅ Required + Conversation member

**Request**:
```json
{
  "level": "ALL | MENTIONS | MUTED"
}
```

**Response** `200`: `{ "success": true, "notificationLevel": "ALL" }`

---

## Invites

### Get Invite Info

```
GET /api/invites/info?token=<token>
```

**Auth**: ❌ Not required (public)

**Response** `200`:
```json
{
  "type": "WORKSPACE | CHANNEL | USER | CONVERSATION",
  "entityId": "uuidv7",
  "entityName": "string",
  "inviterName": "string",
  "expiresAt": "iso8601 | null"
}
```

### Generate Invite Link

```
POST /api/invites/generate
```

**Request**: `{ "type": "WORKSPACE | CHANNEL", "entityId": "uuidv7" }`

**Response**: `{ "token": "hex-token", "url": "https://nexus.app/invite?token=..." }`

### Resolve Invite

```
POST /api/invites/resolve
```

**Request**: `{ "token": "hex-token" }`

**Response**: `{ "success": true, "entityType": "WORKSPACE", "entityId": "uuidv7" }`

### Decline Invite

```
POST /api/invites/decline
```

**Request**: `{ "token": "hex-token" }`

---

## Socket.io Events

### Client → Server

| Event | Payload | Trigger |
|-------|---------|---------|
| `message:send` | `{ tempId, conversationId, content, replyToId?, threadRootId? }` | User presses Enter |
| `workspace:join` | `{ workspaceId }` | Opens workspace view |
| `typing:start` | `{ conversationId, username }` | User starts typing |
| `typing:stop` | `{ conversationId }` | User stops/pauses typing |
| `message:read` | `{ conversationId, messageId }` | User opens/focuses conversation |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message in a conversation the client is viewing |
| `message:update` | `{ messageId, content, isEdited }` | Message was edited |
| `message:delete` | `{ messageId }` | Message was soft-deleted |
| `message:read` | `{ conversationId, userId, lastReadMessageId }` | Read receipt broadcast |
| `message:pin` | `{ messageId, conversationId, pinnedBy, pinnedByUsername }` | Message was pinned |
| `message:unpin` | `{ messageId, conversationId }` | Message was unpinned |
| `conversation:new` | `Conversation` | New DM created |
| `conversation:update` | `{ conversation }` | Sidebar metadata changed |
| `channel:update` | `{ action, channel }` | Channel created/renamed/deleted |
| `channel:member-added` | `{ workspaceId, channelId, addedMembers }` | Members added to channel |
| `channel:member-removed` | `{ workspaceId, channelId, removedUserId }` | Member removed from channel |
| `workspace:update` | `{ action, workspace }` | Workspace updated |
| `member:update` | `{ action, userId, role }` | Member role changed/removed |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `presence:initial` | `{ users: [{ userId, status }] }` | Initial presence state on connect |
| `user:status:update` | `{ userId, status, statusText }` | Status changed |
| `user:update` | `{ userId }` | Profile updated (re-fetch) |
| `presence:update` | `{ userId, status }` | Presence status update |
| `notification:new` | `Notification` | New in-app notification |
| `notification:update` | `Notification` | Notification updated (mark read) |
| `typing:start` | `{ conversationId, username }` | User started typing |
| `typing:stop` | `{ conversationId }` | User stopped typing |
| `threadMessage:new` | `Message` | New reply in a thread the client is viewing |
| `presence:update` | `{ userId, status }` | Presence status updated |
