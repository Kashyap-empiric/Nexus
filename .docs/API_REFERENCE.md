# Nexus — API Reference

> **Last Updated:** 2026-06-19  
> **Purpose:** Complete catalog of all REST endpoints and Socket.io events.

---

## REST Endpoints

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/me` | ✅ JWT | Get current user |

### Conversations
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/conversations` | ✅ | List user's conversations (sidebar) |
| POST | `/api/conversations` | ✅ | Create DM (idempotent via dmPair) |
| GET | `/api/conversations/:id` | ✅ | Get conversation details + members |
| PATCH | `/api/conversations/:id/read` | ✅ | Mark as read (update lastReadMessageId) |

### Messages
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/conversations/:id/messages` | ✅ | Cursor-based pagination (includes `pinnedMessageIds`) |
| POST | `/api/conversations/:id/messages` | ✅ | Send message |
| PATCH | `/api/conversations/:id/messages/:messageId` | ✅ | Edit message |
| DELETE | `/api/conversations/:id/messages/:messageId` | ✅ | Soft-delete message |
| GET | `/api/messages/search?q=` | ✅ | Search messages |
| POST | `/api/conversations/:id/pins/:messageId` | ✅ | Pin a message to conversation |
| DELETE | `/api/conversations/:id/pins/:messageId` | ✅ | Unpin a message from conversation |
| GET | `/api/conversations/:id/pins` | ✅ | List pinned messages for conversation |

### Users
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/users` | ✅ | List all users |
| GET | `/api/users/search?q=` | ✅ | Search users |
| GET | `/api/users/check-username?username=` | ❌ | Check username availability |
| POST | `/api/users/resolve-username` | ❌ | Resolve username to email |
| GET | `/api/users/:id` | ✅ | Get public profile |
| GET | `/api/users/me` | ✅ | Get own profile (full) |
| PATCH | `/api/users/me` | ✅ | Update own profile |
| PATCH | `/api/users/me/avatar` | ✅ | Update avatar URL |
| PATCH | `/api/users/me/status` | ✅ | Update presence status |

### Workspaces
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/workspaces` | ✅ | List user's workspaces |
| POST | `/api/workspaces` | ✅ | Create workspace |
| PATCH | `/api/workspaces/:id` | ✅ | Update workspace settings |
| DELETE | `/api/workspaces/:id` | ✅ | Delete workspace (owner only) |
| GET | `/api/workspaces/:id` | ✅ | Get workspace details + channels |
| POST | `/api/workspaces/:id/leave` | ✅ | Leave workspace |
| GET | `/api/workspaces/:id/members` | ✅ | List workspace members |
| PATCH | `/api/workspaces/:id/members/:userId/role` | ✅ | Change member role |
| DELETE | `/api/workspaces/:id/members/:userId` | ✅ | Remove member from workspace |
| POST | `/api/workspaces/:id/invite` | ✅ | Invite by username |
| POST | `/api/workspaces/:id/invite-multiple` | ✅ | Batch invite by user IDs |
| POST | `/api/workspaces/:id/invite-email` | ✅ | Invite by email (SendGrid) |
| GET | `/api/workspaces/:id/channels` | ✅ | List channels in workspace |
| POST | `/api/workspaces/:id/channels` | ✅ | Create channel |
| PATCH | `/api/workspaces/:id/channels/:channelId` | ✅ | Update channel (rename, visibility) |
| DELETE | `/api/workspaces/:id/channels/:channelId` | ✅ | Delete channel |
| GET | `/api/workspaces/:id/channels/:channelId/members` | ✅ | List channel members |
| POST | `/api/workspaces/:id/channels/:channelId/members` | ✅ | Add members to channel |
| DELETE | `/api/workspaces/:id/channels/:channelId/members/:userId` | ✅ | Remove member from channel |

### Invites
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/invites/info?token=` | ❌ | Get invite info (public) |
| POST | `/api/invites/generate` | ✅ | Generate invite link |
| POST | `/api/invites/resolve` | ✅ | Resolve/consume invite |
| POST | `/api/invites/decline` | ✅ | Decline/revoke invite |
| POST | `/api/workspaces/:id/invite` | ✅ | Invite by username |
| POST | `/api/workspaces/:id/invite-multiple` | ✅ | Batch invite |
| POST | `/api/workspaces/:id/invite-email` | ✅ | Invite by email (SendGrid) |

### Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/notifications` | ✅ | List notifications (paginated) |
| GET | `/api/notifications/unread-count` | ✅ | Get unread count |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark one as read |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all as read |
| POST | `/api/notifications/push/subscribe` | ✅ | Subscribe to push |
| DELETE | `/api/notifications/push/subscribe` | ✅ | Unsubscribe from push |
| GET | `/api/notifications/preferences` | ✅ | Get notification preferences |
| PUT | `/api/notifications/preferences` | ✅ | Update notification preferences |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ tempId, conversationId, content, replyToId? }` | Send message |
| `workspace:join` | `{ workspaceId }` | Join workspace room |
| `typing:start` | `{ conversationId, username }` | Start typing |
| `typing:stop` | `{ conversationId }` | Stop typing |
| `message:read` | `{ conversationId, messageId }` | Send read receipt |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message |
| `message:update` | `{ messageId, content, isEdited }` | Message edited |
| `message:delete` | `{ messageId }` | Message deleted |
| `message:read` | `{ conversationId, userId, lastReadMessageId }` | Read receipt |
| `conversation:new` | `Conversation` | New conversation created |
| `conversation:update` | `{ conversation }` | Conversation metadata changed |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `presence:initial` | `{ userIds: string[] }` | Initial presence state |
| `user:status:update` | `{ userId, status, statusText }` | Status changed |
| `user:update` | `{ userId, ...fields }` | Profile updated |
| `channel:update` | `{ action, channel, userId? }` | Channel created/renamed/deleted |
| `member:update` | `{ action, userId, role }` | Member role changed |
| `workspace:update` | `{ action, workspace }` | Workspace updated |
| `channel:member-added` | `{ workspaceId, channelId, addedMembers }` | Members added to channel |
| `channel:member-removed` | `{ workspaceId, channelId, removedUserId }` | Member removed from channel |
| `message:pin` | `{ messageId, conversationId, pinnedBy, pinnedByUsername, action }` | Message pinned |
| `message:unpin` | `{ messageId, conversationId, pinnedBy, action }` | Message unpinned |
| `notification:new` | `Notification` | New notification |
| `user:online` | `{ userId }` | User came online (from presence) |
| `typing:start` | `{ conversationId, username }` | User started typing |
| `typing:stop` | `{ conversationId }` | User stopped typing |
