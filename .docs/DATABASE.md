# Nexus — Database Schema

> **Last Updated:** 2026-06-19  
> **Purpose:** Complete database schema reference. All models, fields, relations, and constraints.

---

## Architectural Decisions

1. **UUIDv7 Primary Keys**: All `id` fields use UUIDv7 for time-ordered cursor pagination. Generate in app layer using the `uuidv7` npm package — do not use `crypto.randomUUID()` or Prisma's `@default(uuid())`.
2. **Supabase Auth Separation**: Supabase handles authentication. The Prisma `User` table is synced via a Supabase database trigger (`SUPABASE_QUERIES.sql`), not through Express middleware.
3. **Soft Deletes**: Messages use `deletedAt` for soft deletion. All queries must filter `where: { deletedAt: null }`.

---

## Models

### User
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | UUIDv7 (matches Supabase Auth UID) |
| email | String | @unique | |
| username | String | | Synced from Supabase Auth metadata |
| fullName | String? | | |
| avatarUrl | String? | | |
| avatarPath | String? | | For uploaded avatars |
| bio | String? | @db.Text | |
| status | UserStatus? | Enum: AVAILABLE, AWAY, DND, INVISIBLE |
| statusText | String? | | Custom status text |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

### Notification
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | @id @default(cuid()) | |
| userId | String | FK → User | Recipient |
| type | NotificationType | Enum: INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, MEMBER_REMOVED |
| title | String | | Short title |
| body | String? | | Optional body |
| link | String? | | Deep link |
| imageUrl | String? | | |
| read | Boolean | @default(false) | |
| metadata | Json? | | Flexible payload |
| createdAt | DateTime | @default(now()) | |

Index: `@@index([userId, read, createdAt])`

### PushSubscription
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | @id @default(cuid()) | |
| userId | String | FK → User | |
| endpoint | String | @unique @db.Text | Browser push endpoint |
| p256dh | String | | Encryption key |
| auth | String | | Auth secret |
| userAgent | String? | | Browser info |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

### Workspace
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | UUIDv7 |
| name | String | | Display name |
| slug | String | @unique | URL-friendly identifier |
| imageUrl | String? | | Workspace avatar |
| ownerId | String | FK → User | Creator |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

### WorkspaceMember
Composite PK: `@@id([workspaceId, userId])`

| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| workspaceId | String | FK → Workspace | |
| userId | String | FK → User | |
| role | WorkspaceRole | @default(MEMBER) | Enum: OWNER, ADMIN, MEMBER |
| joinedAt | DateTime | @default(now()) | |

### Conversation
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | UUIDv7 |
| type | ConversationType | | Enum: DM, CHANNEL |
| name | String? | | Channel name, null for DMs |
| workspaceId | String? | FK → Workspace | null for DMs |
| visibility | ChannelVisibility? | @default(PUBLIC) | Enum: PUBLIC, PRIVATE |
| createdBy | String? | | User ID who created this channel |
| dmPair | String? | @unique | Sorted user pair for DM dedup |
| latestMessageId | String? | FK → Message | Sidebar preview |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

### ConversationMember
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | cuid (for backward compat) |
| conversationId | String | FK → Conversation | |
| userId | String | FK → User | |
| lastReadMessageId | String? | FK → Message | Read receipt |
| joinedAt | DateTime | @default(now()) | |

Unique: `@@unique([conversationId, userId])`

### Message
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | UUIDv7 — used for sorting |
| content | String | | Message text (markdown) |
| conversationId | String | FK → Conversation | |
| userId | String | FK → User | Sender |
| replyToId | String? | FK → Message | Reply parent |
| isEdited | Boolean | @default(false) | |
| deletedAt | DateTime? | | Soft delete |
| pending | Boolean | @default(false) | |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

Index: `@@index([conversationId, id])` — critical for cursor pagination

### Invite
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | PK | UUIDv7 |
| type | InviteType | Enum: USER, CONVERSATION, WORKSPACE, CHANNEL |
| entityId | String | | Target entity |
| token | String | @unique | Random hex (32 bytes) |
| maxUses | Int? | | null = unlimited |
| usedCount | Int | @default(0) | |
| expiresAt | DateTime? | | Default: 7 days |
| revoked | Boolean | @default(false) | |
| createdBy | String | FK → User | |
| lastUsedAt | DateTime? | | |
| createdAt | DateTime | @default(now()) | |

### NotificationPreference
| Field | Type | Attributes | Notes |
|-------|------|-----------|-------|
| id | String | @id @default(cuid()) | |
| userId | String | FK → User | @unique |
| pushEnabled | Boolean | @default(true) | |
| dmMentions | Boolean | @default(true) | |
| channelNotifications | Boolean | @default(true) | |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

---

## Enums

```prisma
enum ConversationType { DM, CHANNEL }
enum ChannelVisibility { PUBLIC, PRIVATE }
enum InviteType { USER, CONVERSATION, WORKSPACE, CHANNEL }
enum WorkspaceRole { OWNER, ADMIN, MEMBER }
enum NotificationType { INVITE_RECEIVED, INVITE_ACCEPTED, MEMBER_JOINED, CHANNEL_CREATED, CHANNEL_MEMBER_ADDED, CHANNEL_MEMBER_REMOVED, MEMBER_REMOVED, MESSAGE_REPLIED, ROLE_CHANGED, WORKSPACE_DELETED }
enum UserStatus { AVAILABLE, AWAY, DND, INVISIBLE }
```

---

## Migration Rules

- All migrations must be **purely additive**: `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX` only.
- Use `@@unique([field1, field2])` instead of composite `@@id` when backward compatibility is required with production.
- Use `IF NOT EXISTS` and PL/pgSQL `DO $$ ... EXCEPTION` blocks for idempotent migrations.
