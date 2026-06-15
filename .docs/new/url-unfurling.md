# URL Unfurling — Feature Design

> **Status:** ❌ Not Started
> **Priority:** P2 (Low)
> **Effort:** 3-5 hours
> **Dependencies:** Message content parsing, external HTTP fetching

---

## Overview

URL Unfurling (link previews) automatically generates rich preview cards when users paste or type URLs in their messages. When a message contains a URL, the server fetches the page's Open Graph (OG) metadata and returns a preview card showing the title, description, and image. Preview cards appear inline below the message content.

---

## A. Data Model

### New Model: `LinkPreview`

```prisma
model LinkPreview {
  id          String   @id @default(cuid())
  url         String   @db.Text                            // Original URL
  domain      String                                       // Extracted domain (e.g., "github.com")
  title       String?                                      // og:title
  description String?                                      // og:description
  imageUrl    String?                                      // og:image
  faviconUrl  String?                                      // Favicon URL
  fetchedAt   DateTime @default(now())

  messages    MessageLinkPreview[]                          // Many-to-many with messages

  @@unique([url])                                          // Cache by URL — one preview per unique URL
  @@index([domain])                                        // Query by domain
  @@index([fetchedAt])                                     // Cleanup old cache entries
}

model MessageLinkPreview {
  messageId     String
  linkPreviewId String

  message       Message      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  linkPreview   LinkPreview  @relation(fields: [linkPreviewId], references: [id])

  @@id([messageId, linkPreviewId])
  @@index([messageId])
}
```

### Why a Separate Model with Caching?

- **Performance**: Fetches OG metadata asynchronously. Same URL in multiple messages reuses cached data.
- **Reliability**: If fetch fails, message is still sent without the preview.
- **Maintenance**: Can clean up old cache entries periodically.
- **No DB changes to Message**: Links are attached via a join table.

### Migration

1. Add `LinkPreview` and `MessageLinkPreview` models to Prisma schema
2. Run: `npx prisma migrate dev --name add_link_previews`

---

## B. API Design

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/link-previews/fetch` | Yes | Fetch OG metadata for a URL |
| `GET` | `/api/link-previews/:id` | Yes | Get cached link preview |

### Request/Response

**Fetch link preview:**
```
POST /api/link-previews/fetch
Body: { "url": "https://github.com/nexus" }
Response 200: {
  "data": {
    "id": "...",
    "url": "https://github.com/nexus",
    "domain": "github.com",
    "title": "Nexus - Real-time Communication Platform",
    "description": "Nexus is a modern communication platform...",
    "imageUrl": "https://github.com/nexus/og-image.png",
    "faviconUrl": "https://github.com/favicon.ico"
  }
}
```

**Get cached preview:**
```
GET /api/link-previews/:id
Response 200: { "data": { /* same as above */ } }
Response 404: { "error": "Link preview not found" }
```

### OG Metadata Fetching (Server-side)

```typescript
// In link-previews.service.ts

import * as cheerio from 'cheerio'; // HTML parsing

export const fetchLinkPreview = async (url: string): Promise<LinkPreviewDTO | null> => {
  try {
    // Validate URL
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    
    // Check cache first
    const cached = await linkPreviewRepo.findByUrl(url);
    if (cached) return cached;
    
    // Fetch page
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Nexus/1.0 LinkPreview' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract OG metadata
    const title = $('meta[property="og:title"]').attr('content') 
      || $('title').text() 
      || null;
    const description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || null;
    const imageUrl = $('meta[property="og:image"]').attr('content') 
      || null;
    
    // Resolve relative image URLs
    const absoluteImageUrl = imageUrl 
      ? new URL(imageUrl, parsed.origin).href 
      : null;
    
    // Get favicon
    const faviconUrl = $('link[rel="icon"]').attr('href')
      || $('link[rel="shortcut icon"]').attr('href')
      || `${parsed.origin}/favicon.ico`;
    const absoluteFaviconUrl = new URL(faviconUrl, parsed.origin).href;
    
    // Cache the result
    const preview = await linkPreviewRepo.create({
      url,
      domain: parsed.hostname,
      title: title?.substring(0, 500),
      description: description?.substring(0, 1000),
      imageUrl: absoluteImageUrl?.substring(0, 2000),
      faviconUrl: absoluteFaviconUrl,
    });
    
    return preview;
  } catch (error) {
    console.error(`[LinkPreview] Failed to fetch ${url}:`, error);
    return null;
  }
};
```

### Integration with Message Creation

Link preview fetching is **asynchronous and non-blocking**:

```typescript
// In messages.service.ts or message.handler.ts

export const createMessage = async (conversationId: string, userId: string, content: string) => {
  // 1. Create and persist message (existing flow)
  const result = await createMessageTransaction(conversationId, userId, content);
  
  // 2. Extract URLs from message content (fire-and-forget)
  const urls = extractUrls(content);
  if (urls.length > 0) {
    // Fetch previews in background — never block message delivery
    queueLinkPreviewFetch(result.message.id, urls[0]); // Only first URL for MVP
  }
  
  // 3. Broadcast message (existing flow) — previews come separately
  dispatchMessageEvent('NEW', conversationId, result.message, result.conversationMetadata);
  
  return result;
};

// After the message is broadcast, send previews via socket
const queueLinkPreviewFetch = async (messageId: string, url: string) => {
  const preview = await fetchLinkPreview(url);
  if (preview) {
    await associatePreviewWithMessage(messageId, preview.id);
    
    // Emit link preview event to conversation room
    getIO().to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.LINK_PREVIEW, {
      messageId,
      preview,
    });
  }
};
```

### URL Extraction

```typescript
export const extractUrls = (content: string): string[] => {
  // URL regex matching http/https URLs
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  return [...new Set(content.match(urlRegex) || [])];
};
```

---

## C. Frontend Design

### New Components

#### `LinkPreviewCard.tsx`
**Location:** `client/src/modules/messages/components/LinkPreviewCard.tsx`

A rich preview card displayed below message content when a URL is detected.

**States:**
| State | UI |
|-------|-----|
| Loading (fetching) | Skeleton card (image placeholder + 2 text lines) |
| Loaded | Rich card with image, title, description, domain, favicon |
| No preview data | Fallback: show domain + URL in simple card |
| Error | Hide card entirely (graceful degradation) |
| Image load error | Show card without image |

**Design:**
```
┌─────────────────────────────────────┐
│ ┌──────────┐                        │
│ │          │  Title of the page     │
│ │  Image   │  Description of the    │
│ │          │  page content...       │
│ │          │                        │
│ └──────────┘  🔗 domain.com         │
└─────────────────────────────────────┘
```

- Compact card: max-width 480px, rounded corners, subtle border
- Image: 120px wide, object-fit cover, on the left
- Text: title (bold, truncate), description (muted, 2-line clamp), domain with favicon
- Entire card clickable → opens URL in new tab
- Card appears after message is sent (asynchronous loading)

#### `LinkPreviewSkeleton.tsx`
**Location:** Shared/skeleton component

A loading placeholder for link previews:
```
┌─────────────────────────────────────┐
│ ┌──────────┐  ████████████████████  │
│ │  ██████  │  ████████████████████  │
│ │  ██████  │  ████████              │
│ └──────────┘                        │
└─────────────────────────────────────┘
```

### Updated Components

#### `MessageGroupItem.tsx`
- After message content, render `<LinkPreviewCard>` if message has link previews
- Pass preview data from the message object or from separate cache
- Handle multiple URLs: show first preview only (MVP), or show all previews

#### `MessageInput.tsx`
- No changes needed — URL detection is server-side
- Future enhancement: show "Paste URL to create preview" hint

### State Management

#### Hooks
```typescript
// useLinkPreviews.ts
export const useLinkPreview = (messageId: string) => {
  return useQuery({
    queryKey: ['link-preview', messageId],
    queryFn: () => getLinkPreviewByMessageId(messageId),
    enabled: !!messageId,
  });
};
```

#### Socket Handler
```typescript
// In message.handlers.ts
export const handleLinkPreview = (data: { messageId: string; preview: LinkPreview }) => {
  // Update the specific message in cache with the preview data
  queryClient.setQueryData(['messages', conversationId], (old) => {
    // Find message by id, attach preview
  });
};
```

---

## D. Real-Time System

### New Socket Event

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `message:link-preview` | S → C | `{ messageId, preview: { id, url, domain, title, description, imageUrl, faviconUrl } }` | Async after URL fetch completes |

### Flow Diagram

```
User sends message with URL → "Check out https://github.com"
  → 1. Message persisted + broadcast immediately (existing flow)
  → 2. Server extracts URLs from content
  → 3. Server checks cache (LinkPreview table)
     → Cache hit: associate with message, emit link-preview event
     → Cache miss: fetch OG metadata (async, 5s timeout)
       → Success: cache + associate + emit
       → Failure: silently skip (no preview)
  → 4. Client receives message:new → renders message text
  → 5. Client receives message:link-preview → renders preview card below message
```

### Why Two Events?

- **Separation of concerns**: Message delivery is never blocked by slow external fetches
- **Progressive enhancement**: Text appears first, preview loads after
- **Resilience**: If fetch fails, message is still fully delivered

---

## E. Edge Cases

| Scenario | Handling |
|----------|----------|
| **Multiple URLs in one message** | MVP: only preview the first URL. Future: preview all URLs. |
| **URL in edited message** | Extract URLs from edited content. If new URLs, fetch previews. |
| **Same URL posted multiple times** | Cache hit — reuse existing preview. No re-fetch. |
| **Slow URL (5s+ timeout)** | Timeout after 5s. No preview shown. |
| **URL returns non-HTML (PDF, image, video)** | Skip — only fetch HTML pages with OG metadata. |
| **Image URL (direct .jpg/.png)** | Show basic card with domain + URL. No OG metadata. |
| **Secure vs non-secure URLs** | Only http/https supported. Skip other protocols. |
| **URL in code block** | Skip URLs inside markdown code blocks. |
| **Very long URLs** | Truncate display URL in card. |
| **URL with no OG metadata** | Show fallback card with domain, URL, and favicon only. |
| **External service rate-limiting** | Cache prevents repeated fetches. Add rate limiting per domain. |
| **IPFS / tor / localhost URLs** | Skip — only public http/https URLs. |
| **User navigates away before preview loads** | Preview loads in background. Shown when user returns. |
| **Privacy (URL contains sensitive info)** | URLs are stored in LinkPreview table. Consider URL hashing for privacy-sensitive environments. |
| **Deleted message with preview** | Cascade delete cleans up MessageLinkPreview. Keep LinkPreview record (may be reused). |

---

## F. Implementation Plan

### Phase 1: Backend (2-3 hours)

**Step 1: Migration**
- Add `LinkPreview` + `MessageLinkPreview` models to Prisma schema
- Run migration

**Step 2: OG Fetch Service**
- Install `cheerio` for HTML parsing: `npm install cheerio`
- Create `server/src/services/link-preview.service.ts`:
  - `extractUrls(content)` — URL regex extraction
  - `fetchLinkPreview(url)` — OG metadata fetch + cache
  - `fetchFavicon(url)` — favicon URL extraction
  - Respect robots.txt? Deferred

**Step 3: Repository**
- Create `server/src/modules/link-previews/link-previews.repository.ts`:
  - `findByUrl(url)` — cache lookup
  - `create(data)` — store new preview
  - `associateWithMessage(messageId, previewId)` — create join record
  - `getPreviewsByMessageId(messageId)` — get previews for a message

**Step 4: Controller & Routes**
- Create `server/src/modules/link-previews/link-previews.controller.ts`
- Create `server/src/modules/link-previews/link-previews.routes.ts`
- Add POST `/link-previews/fetch` and GET `/link-previews/:id`

**Step 5: Socket Events**
- Add `LINK_PREVIEW: "message:link-preview"` to `SOCKET_EVENTS`
- Integrate preview fetch into message creation flow

### Phase 2: Frontend (1-2 hours)

**Step 6: Components**
- Create `LinkPreviewCard.tsx`
- Create `LinkPreviewSkeleton.tsx`

**Step 7: Integration**
- Add to `MessageGroupItem.tsx` below message content
- Add socket handler for `message:link-preview`

---

## G. Files Changed Summary

### Server

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add LinkPreview + MessageLinkPreview models |
| `server/package.json` | Add `cheerio` dependency |
| `server/src/services/link-preview.service.ts` | **NEW** — OG fetch + URL extraction |
| `server/src/modules/link-previews/link-previews.repository.ts` | **NEW** — cache CRUD |
| `server/src/modules/link-previews/link-previews.controller.ts` | **NEW** — handlers |
| `server/src/modules/link-previews/link-previews.routes.ts` | **NEW** — routes |
| `server/src/modules/messages/messages.service.ts` | Integrate async preview fetch |
| `server/src/shared/socket-events.ts` | Add LINK_PREVIEW |
| `server/src/socket/socket.dispatcher.ts` | Add dispatchLinkPreview |

### Client

| File | Change |
|------|--------|
| `client/package.json` | No new dependencies needed |
| `client/src/modules/messages/components/LinkPreviewCard.tsx` | **NEW** — preview card |
| `client/src/modules/messages/components/LinkPreviewSkeleton.tsx` | **NEW** — loading state |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | Add LinkPreviewCard |
| `client/src/modules/messages/api/messages.api.ts` | Optional: fetch preview API |
| `client/src/socket/handlers/message.handlers.ts` | Add handleLinkPreview |
| `client/src/socket/socket-events.ts` | Add LINK_PREVIEW constant |

---

## H. Future Enhancements

| Feature | Complexity | Notes |
|---------|------------|-------|
| Image URL preview (direct image links) | Low | Show image inline instead of OG card |
| Twitter/X embeds | Medium | Special handling for twitter.com links |
| YouTube embeds | Medium | Show video player inline |
| Multiple URL previews per message | Low | Show all previews, not just first |
| Rate limiting per domain | Low | Prevent hammering external sites |
| Link preview settings | Medium | Per-user toggle for previews |
| Whitelist/blacklist domains | Low | Admin settings for allowed domains |
| Preview for edited messages | Low | Re-extract URLs after edit |
| Cache cleanup cron job | Low | Delete old (>30 days) cache entries |
