# Nexus — Known Limitations

> **Last Updated:** 2026-06-17  
> **Purpose:** Track known limitations, technical debt, and constraints.

---

## Critical

| Limitation | Impact | Status |
|------------|--------|--------|
| Channel Read Receipts | `partnerLastReadMessageId` is undefined for channels — double checkmark never shows for channel messages | 🟡 Open |
| Non-transactional reads in `editMessage` | `getMessageById` called outside `$transaction` — potential race condition | 🟡 Open |
| Presence in-memory Map | Prevents horizontal scaling beyond single Node.js instance. Needs Redis Pub/Sub adapter. | 🟡 Open |
| `editMessage` stale `updatedAt` | Editing a message doesn't bump the conversation's position in the sidebar | 🟡 Open |

## Moderate

| Limitation | Impact | Status |
|------------|--------|--------|
| Push subscription lifecycle | No proactive re-subscription on SW `pushsubscriptionchange` events | 🟡 Open |
| Optimistic channel creation | Currently poll-based (5s interval) — should use socket events | 🟡 Open |
| No `lg:`/`xl:` breakpoints | Layout jumps from mobile to a single desktop view at 768px. Wide screens may feel stretched. | 🟡 Acknowledged |
| N+1 user queries in push notifications | `sendMessageNotifications` queries each member individually instead of batching | 🟡 Open |

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

## Resolved

| Limitation | Resolution | Date |
|------------|-----------|------|
| Soft-delete filtering in `getMessages` | Added `where: { deletedAt: null }` | 2026-06-11 |
| Pagination ordering from `createdAt` to `id` | Switched to `id` ordering for UUIDv7 monotonic guarantees | 2026-06-11 |
| Race condition in `deleteMessage` | Added `$transaction` wrapper | 2026-06-11 |
| Private channel socket room leak | `findWorkspaceChannelsByUserId` filters private channels by membership | 2026-06-12 |
| Push subscription hijacking | `deleteMany` before reassignment | 2026-06-15 |

---

## Future Compatibility Concerns

- **Server scaling**: Presence system requires Redis Pub/Sub for Socket.io to scale horizontally
- **Database connection pooling**: Prisma in serverless environments requires connection pooling via Supabase Pooler or PgBouncer
- **File storage**: No S3/cloud storage integration — avatar uploads use local paths
- **Bundle size**: No dynamic imports currently implemented for heavy components (emoji-picker-react ~200KB, react-markdown ~50KB)
- **No performance budget**: No automated performance testing or bundle size checks in CI/CD
