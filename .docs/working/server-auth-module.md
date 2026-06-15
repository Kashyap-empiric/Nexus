# Server Auth Module

**Location:** `server/src/modules/auth/`

## Overview

The Auth module handles user authentication verification and permission/access checks across the application. It does NOT handle user creation or login — that is delegated entirely to **Supabase Auth**. The server only verifies tokens issued by Supabase and checks user permissions against workspaces and conversations.

---

## Files & Functions

### `auth.service.ts`
Business logic layer for authentication and authorization operations.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `isWorkspaceMember` | `(userId: string, workspaceId: string) => Promise<boolean>` | Checks if a user belongs to a workspace | Used by workspace operations (socket join, channel create, invite) to verify basic workspace membership |
| `verifyConversationMembership` | `(userId: string, conversationId: string) => Promise<boolean>` | Checks if a user is a member of a specific conversation | Used by `requireConversationMember` middleware and socket message handlers |
| `getUserConversationMemberships` | `(userId: string) => Promise<{conversationId: string}[]>` | Gets all DM conversation IDs for a user | Used during socket connection to pre-join the user to their DM room |
| `getUserWorkspaceChannels` | `(userId: string) => Promise<{id: string}[]>` | Gets all accessible channel IDs for a user across workspaces | Used during socket connection to pre-join the user to channel rooms |
| `getUserWorkspaceIds` | `(userId: string) => Promise<string[]>` | Gets all workspace IDs a user belongs to | Used during socket connection to join workspace broadcast rooms |

### `auth.repository.ts`
Data access layer — interacts with Prisma to query the database for access checks.

| Function | Signature | Purpose | Why Used |
|---|---|---|---|
| `findWorkspaceMember` | `(userId, workspaceId) => Promise<WorkspaceMember\|null>` | Finds a workspace membership record | Direct DB query for `isWorkspaceMember` |
| `checkConversationAccess` | `(userId, conversationId) => Promise<boolean>` | Validates user access to a conversation considering DM/Private/Public visibility | Central access logic — DMs and private channels require explicit membership; public channels require workspace membership |
| `findConversationMembershipsByUserId` | `(userId) => Promise<{conversationId}[]>` | Finds all DM memberships for a user | Used to pre-join socket rooms |
| `findWorkspaceChannelsByUserId` | `(userId) => Promise<{id}[]>` | Finds all accessible channels (public + private where member) | Channel room pre-join for sockets |
| `findUserWorkspaceIds` | `(userId) => Promise<string[]>` | Finds all workspace IDs a user belongs to | Workspace room pre-join for sockets |

### `auth.types.ts`
TypeScript interfaces for permission check results and service input parameters.

| Type | Fields | Purpose |
|---|---|---|
| `MembershipCheck` | `{ isMember: boolean }` | Simple boolean membership check result |
| `WorkspaceAccess` | `{ isMember: boolean; role: "ADMIN"\|"MEMBER"\|null }` | Extended workspace access with role info |
| `ConversationAccess` | `{ isMember: boolean; conversationType: "DM"\|"CHANNEL"\|null }` | Extended conversation access with type info |
| `WorkspaceMembershipParams` | `{ userId: string; workspaceId: string }` | Standard parameters for workspace membership checks |
| `ConversationMembershipParams` | `{ userId: string; conversationId: string }` | Standard parameters for conversation membership checks |

---

## Architecture Decisions

1. **Supabase Auth delegation**: User registration, login, password reset, and OAuth are handled entirely by Supabase. The server never stores passwords or creates users directly — it only verifies JWTs issued by Supabase. This dramatically reduces security surface area.

2. **Dual access model**: The system supports two types of conversations — DMs (always private, membership-based) and Channels (public = workspace-member access, private = explicit membership). The `checkConversationAccess` function in the repository implements this branching logic.

3. **Socket room pre-joining**: On socket connection, the system proactively loads all conversations and workspace channels the user belongs to, and joins them to the corresponding Socket.io rooms. This avoids permission checks per-event and enables instant message delivery.

4. **Exported via `permissions.ts`**: The auth service functions are re-exported through `server/src/shared/permissions.ts` for backward compatibility and to avoid circular imports.
