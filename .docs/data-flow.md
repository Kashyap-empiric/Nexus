# Nexus: Data Flow

> **Last Updated:** 2026-06-03
> **Status:** Pre-build reference (planned flows, not yet implemented)

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
| Send a message | REST POST | `POST /messages` |
| Fetch message history | REST GET | `GET /messages?conversationId=...` |
| Receive a new message in real-time | Socket event | `message:new` |
| Mark conversation as read | Socket event | `message:read` |
| User comes online / goes offline | Socket event | `user:online`, `user:offline` |

---

## 3. Authentication Flow

1. Client submits login/register form.
2. Supabase Auth returns a JWT access token.
3. Client includes the JWT as a `Bearer` token on all API requests.
4. Express auth middleware verifies the JWT with Supabase on every protected route.
5. On first login, the server upserts the user into the Prisma `User` table to sync with Supabase Auth.

---

## 4. Send Message Flow

1. User sends a message in the UI.
2. Client calls `POST /messages` with `{ conversationId, content }`.
3. Server persists the message via Prisma.
4. After a successful DB write, the server emits `message:new` to the Socket.io room for that conversation.
5. All clients in the room (including the sender) receive the event and update the UI.

---

## 5. Presence Flow

- On WebSocket connect, the server increments a `socketCount` key in Redis for that user and broadcasts `user:online`.
- On disconnect, the server decrements the count. If it reaches 0 (all tabs closed), it sets status to `offline` and broadcasts `user:offline`.
- The `socketCount` approach handles multi-tab correctly. A user only goes offline when all their connections drop.

---

## 6. Read Receipt Flow

1. Client emits `message:read { conversationId }` when the user opens or scrolls to the bottom of a conversation.
2. Server updates `last_read_at` on the `ConversationMember` row.
3. Server broadcasts `message:read` to the room so other participants can update the "seen" indicator.

---

## 7. Room Strategy

Each conversation gets a Socket.io room named `conversation:{id}`. Clients join the room when they open a conversation. The server broadcasts events only to that room. Users in other conversations are not affected.
