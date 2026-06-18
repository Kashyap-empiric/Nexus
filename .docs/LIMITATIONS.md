# Nexus — Known Limitations

> **Last Updated:** 2026-06-18  
> **Purpose:** Track known limitations, technical debt, and constraints.

---

## Critical

| Limitation | Impact | Status |
|------------|--------|--------|
| Channel Read Receipts | `partnerLastReadMessageId` is undefined for channels — double checkmark never shows for channel messages | 🟡 Open |
| Non-transactional reads in `editMessage` | `getMessageById` called outside `$transaction` — potential race condition | 🟡 Open |
| Presence in-memory Map | Prevents horizontal scaling beyond single Node.js instance. Needs Redis Pub/Sub adapter. | 🟡 Open |
| `editMessage` stale `updatedAt` | Editing a message doesn't bump the conversation's position in the sidebar | 🟡 Open |
| In-memory rate limiter | Per-process only — breaks in multi-instance deployments | 🟡 Open |

## Moderate

| Limitation | Impact | Status |
|------------|--------|--------|
| Push subscription lifecycle | No proactive re-subscription on SW `pushsubscriptionchange` events | 🟡 Open |
| Optimistic channel creation | Currently poll-based (5s interval) — should use socket events | 🟡 Open |
| No `lg:`/`xl:` breakpoints | Layout jumps from mobile to a single desktop view at 768px. Wide screens may feel stretched. | 🟡 Acknowledged |
| N+1 user queries in push notifications | `sendMessageNotifications` queries each member individually instead of batching | 🟡 Open |
| No automated tests | Large real-time messaging surface without regression coverage | 🟡 Open |
| Stringly-typed error handling | Controllers catch `any` and compare error message strings | 🟡 Open |
| Stale npm lockfile removed (pnpm) | `client/package-lock.json` was out of sync with `package.json` — removed. Only pnpm lock is authoritative. | ✅ Resolved 2026-06-18 |
| Missing env runtime validation | Both client and server used non-null assertions without Zod validation | ✅ Resolved 2026-06-18 |
| Server lacked lint/typecheck scripts | Added `npm run lint` and `npm run typecheck` to server/package.json | ✅ Resolved 2026-06-18 |
| Debug console.log in app.ts | Leftover `console.log(allowedOrigins)` in app.ts startup — removed | ✅ Resolved 2026-06-18 |

## Minor

| Limitation | Impact | Status |
|------------|--------|--------|
| Fixed-width panels | InfoPanel (w-80), MemberListPanel (w-72), Sidebar (md:w-72) consume significant space on tablets | 🟡 Acknowledged |
| Emoji picker width | Hardcoded 300px — doesn't adapt to wider screens | 🟡 Acknowledged |
| Service worker scope | SW only handles push events. No caching strategies implemented. | 🟡 Acknowledged |
| No React.memo usage | Message list items re-render on every parent state change | 🟡 Acknowledged |
| Cache invalidation over-invalidation | Status updates trigger full query cache invalidation instead of targeted updates | 🟡 Acknowledged |
| No staleTime in QueryClient | All queries are considered stale immediately, causing refetches on every navigation | 🟡 Acknowledged |
| Excessive console.log in production | Push and notification services log extensively, consuming Render log quota | 🟡 Acknowledged |
| Message search uses `contains` | No full-text search index — will slow at 50K+ messages | 🟡 Acknowledged |
| 105 ESLint issues in client | 54 errors, 51 warnings — linting debt needs systematic cleanup | 🟡 Open |
| Any casts in socket/event layers | Client socket handlers use loose typing | 🟡 Acknowledged |

## Resolved

| Limitation | Resolution | Date |
|------------|-----------|------|
| Soft-delete filtering in `getMessages` | Added `where: { deletedAt: null }` | 2026-06-11 |
| Pagination ordering from `createdAt` to `id` | Switched to `id` ordering for UUIDv7 monotonic guarantees | 2026-06-11 |
| Race condition in `deleteMessage` | Added `$transaction` wrapper | 2026-06-11 |
| Private channel socket room leak | `findWorkspaceChannelsByUserId` filters private channels by membership | 2026-06-12 |
| Push subscription hijacking | `deleteMany` before reassignment | 2026-06-15 |
| Stale npm lockfile | Removed `client/package-lock.json` (pnpm is authoritative) | 2026-06-18 |
| Missing env validation | Added Zod runtime validation for client and server env vars | 2026-06-18 |
| Server lint/typecheck scripts | Added to `server/package.json` | 2026-06-18 |
| Debug console.log | Removed leftover `console.log(allowedOrigins)` from app.ts | 2026-06-18 |

---

## Future Compatibility Concerns

- **Server scaling**: Presence system requires Redis Pub/Sub for Socket.io to scale horizontally
- **Rate limiter**: In-memory implementation won't work across multiple server instances
- **Database connection pooling**: Prisma in serverless environments requires connection pooling via Supabase Pooler or PgBouncer
- **File storage**: No S3/cloud storage integration — avatar uploads use local paths
- **Bundle size**: No dynamic imports currently implemented for heavy components (emoji-picker-react ~200KB, react-markdown ~50KB)
- **No performance budget**: No automated performance testing or bundle size checks in CI/CD
- **ESLint debt**: 105 issues increasing risk of shipping with preventable bugs
