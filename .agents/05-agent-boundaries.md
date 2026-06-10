# Agent Boundaries & Rules of Engagement

> **MANDATORY**: Any AI agent operating within the Nexus repository must abide by these strict boundaries to prevent further architectural drift and data corruption.

## 1. Event Ownership Rules
- **No Controller Event Emissions**: Do NOT manually import `socket.io` to emit `MESSAGE_NEW`, `MESSAGE_UPDATE`, etc., from Express controllers. 
- **Decoupled Metadata**: The client does not infer metadata. The server is strictly responsible for emitting `CONVERSATION_UPDATE` when a conversation's `updatedAt`, `latestMessage`, or `latestMessageId` changes.

## 2. Transaction Integrity Boundaries
- **No Non-Transactional Reads**: All database reads required to execute an update or delete MUST occur inside the `prisma.$transaction(async (tx) => { ... })` callback. 
- **Example Violation**: Fetching `getMessageById` to verify ownership *before* starting the transaction, as currently seen in `messages.service.ts`. Future refactors must fix this, and new code must not replicate it.

## 3. Data Normalization Rules
- **Respect Soft Deletes**: Any Prisma `findMany` query on entities with a `deletedAt` schema MUST explicitly include `where: { deletedAt: null }`. 
- **UUIDv7 Pagination**: Cursor pagination must strictly order by `id: "desc"` rather than `createdAt: "desc"` to utilize monotonic guarantees.

## 4. Input/Output Contracts
- Agents must not assume endpoints exist without verifying in `*.routes.ts`. 
- Frontend cache mutations must use `tempId` for optimistic updates, handling failures with query rollback.
