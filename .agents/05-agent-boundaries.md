# Agent Boundaries & Rules of Engagement

> **MANDATORY**: Any AI agent operating within the Nexus repository must abide by these strict boundaries to prevent further architectural drift and data corruption.

## 1. Event Ownership Rules
- **No Controller Event Emissions**: Do NOT manually import `socket.io` to emit `MESSAGE_NEW`, `MESSAGE_UPDATE`, etc., from Express controllers.
- **Use socket.dispatcher.ts**: All socket emissions must go through `socket.dispatcher.ts` typed helpers (`dispatchMessageEvent`, `dispatchMessageRead`, `dispatchUserPresence`, `dispatchConversationNew`).
- **Decoupled Metadata**: The client does not infer metadata. The server is strictly responsible for emitting `CONVERSATION_UPDATE` when a conversation's `updatedAt`, `latestMessage`, or `latestMessageId` changes.
- **Constant Names**: Use the `SOCKET_EVENTS` constants from `shared/socket-events.ts` — never emit raw string literals (e.g., use `SOCKET_EVENTS.CONVERSATION_UPDATE`, not `"CONVERSATION_UPDATE"`).

## 2. Transaction Integrity Boundaries
- **No Non-Transactional Reads**: All database reads required to execute an update or delete MUST occur inside the `prisma.$transaction(async (tx) => { ... })` callback.
- **Example Violation**: Fetching `getMessageById` to verify ownership *before* starting the transaction, as currently seen in `messages.service.ts`. Future refactors must fix this, and new code must not replicate it.

## 3. Data Normalization Rules
- **Respect Soft Deletes**: Any Prisma `findMany` query on entities with a `deletedAt` schema MUST explicitly include `where: { deletedAt: null }`.
- **UUIDv7 Pagination**: Cursor pagination must strictly order by `id: "desc"` rather than `createdAt: "desc"` to utilize monotonic guarantees.

## 4. Input/Output Contracts
- Agents must not assume endpoints exist without verifying in `*.routes.ts`.
- Frontend cache mutations must use `tempId` for optimistic updates, handling failures with query rollback.
- Socket event names must match the `SOCKET_EVENTS` constants. See `.docs/socket.md` for complete event reference.

## 5. Documentation Requirements
- **Socket changes**: Any new socket event, payload change, or flow modification must be documented in `.docs/socket.md`.
- **Module changes**: Update the relevant `.docs/public-docs/modules/<module>.md` file when adding or modifying module behavior.
- **Incremental logs**: Every session must append to `.docs/incremental-logs.md`.
