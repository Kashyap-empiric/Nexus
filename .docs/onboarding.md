# Nexus — Local Development Setup

> **Last Updated:** 2026-06-11
> **Prerequisites:** Node.js 20+, npm 9+, a Supabase account, and an Upstash Redis account.

---

## 1. Clone & Install

```bash
git clone <repo-url> nexus
cd nexus
```

### Server

```bash
cd server
npm install
```

### Client

```bash
cd client
npm install
```

---

## 2. Environment Configuration

### Server (`server/.env`)

```env
# Required
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Only needed for seeding
CLIENT_URL=http://localhost:3001

# Optional — Presence (standard Redis connection string)
REDIS_URL=redis://default:password@host:port

# Optional — Rate Limiting (defaults shown)
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes default
RATE_LIMIT_MAX=1000                # 1000 requests/window default
MESSAGE_RATE_LIMIT_WINDOW_MS=60000 # 1 minute default
MESSAGE_RATE_LIMIT_MAX=20          # 20 messages/window default
```

| Variable | Required | Default | Source |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Supabase Project Settings → Database → Connection string |
| `SUPABASE_URL` | Yes | — | Supabase Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For seeding | — | Supabase Project Settings → API → `service_role` key |
| `CLIENT_URL` | Yes | `http://localhost:3001` | Your Next.js dev URL |
| `REDIS_URL` | No | — | Redis connection string (`redis://...` or `rediss://...`). Use Upstash or local Redis. |
| `PORT` | No | `4000` | Express server port |

### Client (`client/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

| Variable | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Project Settings → API → `anon` public key |
| `NEXT_PUBLIC_API_URL` | Yes | Express server URL + `/api` prefix |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Express server base URL (no `/api`) |

---

## 3. Database Setup

### 3.1 Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database** and copy the connection string
3. Go to **Project Settings → API** and copy the `Project URL`, `anon` key, and `service_role` key
4. Go to **SQL Editor** and run the trigger script from `server/prisma/SUPABASE_QUERIES.sql`

### 3.2 Run Migrations

```bash
cd server
npx prisma migrate dev
```

This applies all migrations and generates the Prisma client.

### 3.3 Seed Database (Optional)

```bash
cd server
npx prisma db seed
```

This creates two test users (`alice@example.com` / `bob@example.com`, password: `password123`) and a DM conversation with 5 sample messages.

> **Note:** Seeding requires `SUPABASE_SERVICE_ROLE_KEY` in your `server/.env`.

---

## 4. Redis Setup (Presence)

Presence tracking works with **or without** Redis:

- **With Redis:** Use a standard Redis connection string (`redis://` or `rediss://`). You can use [Upstash](https://upstash.com), [Redis Cloud](https://redis.com), or run Redis locally via Docker: `docker run -p 6379:6379 redis`. Set `REDIS_URL=redis://localhost:6379` in `server/.env`.
- **Without Redis:** The `presenceStore.ts` falls back to in-memory storage. Presence works fine for single-instance development, but state resets on server restart.

---

## 5. Running Locally

### Terminal 1 — Server

```bash
cd server
npm run dev
```

Starts the Express server on port 4000 with hot-reload via `nodemon` + `tsx`.

- Health check: `http://localhost:4000/health`
- Socket.io: `http://localhost:4000` (same port)

### Terminal 2 — Client

```bash
cd client
npm run dev
```

Starts the Next.js dev server on port 3001.

- App: `http://localhost:3001`

---

## 6. Verifying the Setup

| Check | Command / URL | Expected Result |
|---|---|---|
| Server health | `curl http://localhost:4000/health` | `{ "status": "ok", "timestamp": "..." }` |
| Redis connected | Server logs | `Redis connected` (if configured) |
| Prisma connected | Server logs | No connection errors |
| Client loads | Open `http://localhost:3001` | Landing page renders |
| Auth works | Register / Login | Redirects to `/conversations` |
| Socket connects | Open browser DevTools → Network → WS | Connection to `ws://localhost:4000` |
| Seed users exist | Login as alice@example.com / password123 | DM with "bob" appears in sidebar |
| Presence works | Open two browser tabs → login as different users | Green dots appear |

---

## 7. Common Issues

| Issue | Likely Cause | Fix |
|---|---|---|
| `Cannot find module '@prisma/client'` | Prisma client not generated | Run `npx prisma generate` in `server/` |
| `Invalid connection string` | Wrong `DATABASE_URL` | Check Supabase → Project Settings → Database |
| `Auth: SessionMissingError` | No Supabase keys configured | Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `Redis Client Error: Error: connect ECONNREFUSED` | Redis not configured | Either set `REDIS_URL` or ignore — presence falls back to in-memory storage |
| `CORS error` | `CLIENT_URL` mismatch | Ensure `server/.env: CLIENT_URL=http://localhost:3001` |
| Database trigger not syncing users | `SUPABASE_QUERIES.sql` not run | Run the SQL in Supabase SQL Editor |
| Socket connection fails with 401 | JWT not sent on handshake | Check `NEXT_PUBLIC_SOCKET_URL` matches server origin |

---

## 8. Project Scripts

### Server

| Script | Command | Description |
|---|---|---|
| `dev` | `nodemon --exec tsx src/server.ts` | Development with hot-reload |
| `build` | `prisma generate && tsup` | Production build |
| `start` | `node dist/server.js` | Start production server |
| `prisma db seed` | `tsx prisma/seed.ts` | Seed database |

### Client

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev -p 3001` | Development on port 3001 |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
