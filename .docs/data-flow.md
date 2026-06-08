# Nexus: Data Flow

> **Last Updated:** 2026-06-08
> **Status:** Active (Phase 1 Complete)

---

## 1. Overview

All client-server communication falls into two categories:

- **REST (HTTP):** for data operations (create, read, update, delete). Managed by TanStack Query on the client.
- **WebSocket (Socket.io):** for real-time events (new messages, presence, read receipts). Managed by the Socket.io client.

```mermaid
flowchart LR
    Client["Next.js Client"]
    Server["Express Server"]
    DB["PostgreSQL"]
    Redis["Redis"]

    Client -->|REST: data ops| Server
    Client <-->|WebSocket: real-time events| Server
    Server --> DB
    Server --> Redis
```

---

## 2. REST vs Socket.io Split

| Concern | Transport | Example |
|---|---|---|
| Send a message | Socket event (fallback REST) | `message:send` (`POST /messages`) |
| Fetch message history | REST GET | `GET /messages?conversationId=...` |
| Receive a new message in real-time | Socket event | `message:new` |
| Mark conversation as read | Socket event | `message:read` |
| User comes online / goes offline | Socket event | `user:online`, `user:offline` |

---

## 3. Authentication Flow

1. Client submits login/register form (or OAuth).
2. Supabase Auth returns a JWT access token stored securely via cookies.
3. Next.js Edge Middleware checks the cookie to protect client-side routes.
4. Client includes the JWT as a `Bearer` token on all API requests.
5. Express auth middleware verifies the JWT locally using cached ES256 JWKS public keys.
6. On successful verification, the server upserts the user into the Prisma `User` table to sync with Supabase Auth.

---

## 4. Send Message Flow

1. User sends a message in the UI.
2. Client generates a deterministic `tempId` and instantly updates the local cache (Optimistic UI).
3. Client emits a WebSocket event `message:send` with `{ tempId, conversationId, content }`.
4. Server socket handler receives the event, authenticates the user, and persists the message to PostgreSQL via Prisma.
5. After a successful DB write, the server emits `message:new` to the Socket.io room for that conversation.
6. The server acknowledges the sender via the Socket callback, returning the official persisted message.
7. The sender's client replaces the optimistic `tempId` message with the official message.
8. *(Fallback)*: If WebSockets fail or for integration purposes, the client can alternatively call `POST /messages`, which follows the same DB persistence and broadcasting flow.

---

## 5. Presence Flow

- On WebSocket connect, the server increments a `socketCount` key in Redis for that user and broadcasts `user:online`.
- On disconnect, the server decrements the count. If it reaches 0 (all tabs closed), it sets status to `offline` and broadcasts `user:offline`.
- The `socketCount` approach handles multi-tab correctly. A user only goes offline when all their connections drop.

---

## 6. Read Receipt Flow

1. Client calls `PATCH /api/conversations/:id/read` with `{ messageId }` when the user opens a conversation.
2. Server validates the message ownership and updates `lastReadMessageId` on the `ConversationMember` row via Prisma.
3. Server broadcasts `message:read` to the room so other participants can update the "seen" indicator.

---

## 7. Room Strategy

Each conversation gets a Socket.io room named `conversation:{id}`. Clients join the room when they open a conversation. The server broadcasts events only to that room. Users in other conversations are not affected.
