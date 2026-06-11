# Technical Debt Inventory

> **CRITICAL**: All future Nexus agents and developers MUST consult this inventory before planning new features or modifying the backend. Do not assume the system handles these edge cases correctly.

This inventory was compiled during the Phase 1 architectural forensic audit.

---

## 1. Architecture Debt

| Debt Item | Status | Risk Level | Description | Root Cause / Source | Recommendation |
|---|---|---|---|---|---|
| ~~**Overloaded Controllers**~~ | ✅ RESOLVED | HIGH | `messages.controller.ts` directly imports `socket.io` to broadcast `MESSAGE_NEW`, `MESSAGE_UPDATE`, and `MESSAGE_DELETE` events, breaking MVC boundaries and duplicating logic found in `message.handler.ts`. | Rapid prototyping shortcuts during REST vs Socket dual-path implementation. | Extract event emission into a dedicated Pub/Sub service or sink it into `messages.service.ts`. |
| ~~**Horizontal Scalability Trap**~~ | ✅ ACCEPTED | LOW (Single Node) | `presenceStore.ts` uses an in-memory `Map` as a fallback to Redis. Without a Redis Pub/Sub adapter to sync memory states across nodes, Nexus cannot scale to >1 backend instance without fragmenting online presence. | Over-engineering the Upstash timeout fallback without multi-node consideration. | Accept risk: System will exclusively run as a single instance on Render free tier. |

---

## 2. Data Consistency Debt

| Debt Item | Status | Risk Level | Description | Root Cause / Source | Recommendation |
|---|---|---|---|---|---|
| ~~**Race Conditions in Mutations**~~ | ✅ RESOLVED | CRITICAL | Non-transactional reads in `messages.service.ts`. Specifically, `deleteMessage` computes the `nextLatestMessageId` *before* entering the Prisma `$transaction`. Concurrent deletions will corrupt the `Conversation.latestMessageId`. | Misunderstanding of Prisma transaction isolation constraints. | Move all read and logic operations into the `prisma.$transaction(async (tx) => { ... })` callback. |
| ~~**Soft-Delete Leakage**~~ | ✅ RESOLVED | CRITICAL | `getMessages` queries do not include `where: { deletedAt: null }`. This leaks soft-deleted payloads to the client and wastes bandwidth. | Missing filter in the Prisma `findMany` clause. | Add the filter to the backend service. |

---

## 3. Real-Time & Frontend-State Debt

| Debt Item | Status | Risk Level | Description | Root Cause / Source | Recommendation |
|---|---|---|---|---|---|
| ~~**Pagination Ordering**~~ | ✅ RESOLVED | HIGH | Relying on `createdAt: "desc"` instead of `id: "desc"` defeats the purpose of the UUIDv7 primary keys and risks erratic pagination if timestamps collide. | Legacy query logic from before UUIDv7 migration. | Update `getMessages` to `orderBy: { id: "desc" }`. |
| ~~**Manual Cache Fragility**~~ | ✅ RESOLVED | MEDIUM | `updateMessageInCache` and `markMessageDeletedInCache` rely on precise array indexing and `tempId` swapping in TanStack Query. | Soft-delete leakage prevents clean server reconciliation. | Fix backend soft-delete leakage, then transition to standard cache invalidation. |
