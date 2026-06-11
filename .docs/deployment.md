# Nexus — Deployment Architecture

> **Last Updated:** 2026-06-11
> **Server:** Render (manual web service, free tier)
> **Client:** Vercel
> **Redis:** Standard key-value service (e.g., Upstash, Redis Cloud, or any Redis provider)
> **CI/CD:** Render auto-deploys from git (server) + Vercel git integration (client)

---

## 1. Architecture Overview

```mermaid
flowchart TB
    subgraph Platforms["Hosting Platforms"]
        RenderSvc["Render (Web Service)\nExpress.js + Socket.io"]
        Vercel["Vercel\nNext.js 16 SSR"]
    end

    subgraph External["External Services"]
        PG["Supabase PostgreSQL"]
        Redis["Redis Key-Value"]
        Auth["Supabase Auth"]
    end

    User["User Browser"] -->|HTTP + WebSocket| Vercel
    User -->|REST + WebSocket| RenderSvc
    Vercel -->|REST API calls| RenderSvc

    RenderSvc -->|Prisma ORM| PG
    RenderSvc -->|Presence| Redis
    Client -->|Auth SDK| Auth
    RenderSvc -->|JWKS Verify| Auth
```

**Communication pattern:**
- Browser → Vercel: Next.js SSR pages, client-side JS
- Browser → Render: Direct REST API calls + WebSocket connections (the client-side code connects to Render directly, not through Vercel)
- Vercel → Render: Server-side API calls from Next.js (e.g., `getServerSideProps` if used)

---

## 2. Server — Render (Manual Web Service)

The server is deployed as a **manual web service** on Render. No `render.yaml` is used — configuration is done through the Render Dashboard.

### Setup Steps

1. **Create a new Web Service** in Render Dashboard
2. **Connect your GitHub repository** (or deploy via manual branch)
3. **Configure:**
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free
4. **Add Environment Variables** (see section 3)

### Server Details

| Property | Value |
|---|---|
| **Runtime** | Node |
| **Root Directory** | `server/` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Build Artifact** | `server/dist/server.js` |
| **Health Check** | `GET /health` (built into app) |

---

## 3. Environment Variables (Production)

### Server (Render Dashboard)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | Render assigns this automatically (usually `10000`) |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string (with password) |
| `SUPABASE_URL` | Yes | Supabase project URL (for JWKS verification) |
| `CLIENT_URL` | Yes | Production URL of the Vercel frontend (for CORS) |
| `REDIS_URL` | No | Redis connection string for presence. Falls back to in-memory if not set. |

**CORS configuration example:**
```env
CLIENT_URL=https://nexus-client.vercel.app
```

> **Note:** `CLIENT_URL` supports comma-separated values for multiple origins:
> `CLIENT_URL=https://nexus-client.vercel.app,http://localhost:3001`

### Client (Vercel Dashboard → Project Settings → Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `NEXT_PUBLIC_API_URL` | Yes | Render server URL + `/api` (e.g., `https://nexus-server.onrender.com/api`) |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Render server base URL (e.g., `https://nexus-server.onrender.com`) |

> **Important:** `NEXT_PUBLIC_SOCKET_URL` is **derived** from `NEXT_PUBLIC_API_URL` in `client/src/shared/lib/socket.ts` by stripping the `/api` suffix. Ensure `NEXT_PUBLIC_API_URL` ends with `/api`.

---

## 4. Client — Vercel Deployment

The Next.js client is deployed on Vercel via standard git integration.

### Setup Steps

1. Import the GitHub repository in Vercel Dashboard
2. **Framework preset:** Next.js (auto-detected)
3. **Root Directory:** `client`
4. **Build Command:** `npm run build` (auto-detected)
5. **Add Environment Variables** under Project Settings
6. Deploy

### Client Build Process

```bash
npm install
npx next build
```

Output: `client/.next/` — optimized production build.

---

## 5. Redis Configuration

Redis is used as a **standard key-value service** for presence tracking. It's optional — the `presenceStore.ts` falls back to in-memory storage if Redis is unavailable.

### Setup Options

| Provider | Connection String Format | Notes |
|---|---|---|
| **Upstash** | `rediss://default:<password>@<region>.upstash.io:6379` | Free tier available. Use TLS (`rediss://`). |
| **Redis Cloud** | `redis://:<password>@<host>:<port>` or `rediss://...` | Free 30MB tier available. |
| **Self-hosted** | `redis://:<password>@<host>:<port>` | Run on any VPS. |

### Environment Variable

```env
REDIS_URL=rediss://default:password@us1-robust-unicorn-12345.upstash.io:6379
```

---

## 6. CORS Configuration

The server parses `CLIENT_URL` as a comma-separated list:

```typescript
// server/src/config/env.ts
ALLOWED_ORIGINS: (process.env.CLIENT_URL || "").split(',').map(url => url.trim()),
```

**Production example:**
```env
CLIENT_URL=https://nexus-client.vercel.app,http://localhost:3001
```

---

## 7. WebSocket Considerations (Render Free Tier)

Render's free tier has certain limitations for WebSocket connections:

| Concern | Detail |
|---|---|
| **Idle timeout** | ~5 minutes of inactivity |
| **Socket.io keepalive** | Server sends periodic ping/pong frames to keep connections alive |
| **Reconnection** | Socket.io client auto-reconnects on disconnect |
| **Cold starts** | Free tier spins down after 15 minutes of inactivity |

**Mitigation:**
- Socket.io's built-in heartbeat should prevent idle disconnections during active use
- If WebSocket connections drop after inactivity, the Socket.io client auto-reconnects
- For always-on production with active users, consider upgrading to Render's paid tier

---

## 8. Database Migrations in Production

Prisma migrations must be **applied manually** to the production database:

```bash
# From your local machine, pointing to production DATABASE_URL
cd server
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

> **⚠️ Never run `prisma migrate dev` against production** — that command resets data. Use `prisma migrate deploy` instead.

---

## 9. Known Production Limitations

| Limitation | Impact | Notes |
|---|---|---|
| **Single Socket.io instance** | Cannot scale to >1 server instance | Lower priority for MVP |
| **In-memory rate limiter** | Rate limit state resets on server restart | Acceptable for MVP |
| **Render free tier** | Cold starts after inactivity, potential WebSocket timeout | Upgrade for active production use |
| **No error monitoring** | Errors only visible in Render/Vercel logs | Add Sentry or similar |
| **Single Socket.io instance** | Cannot scale to >1 server instance | Lower priority for MVP |
| **In-memory rate limiter** | Rate limit state resets on server restart | Acceptable for MVP |
