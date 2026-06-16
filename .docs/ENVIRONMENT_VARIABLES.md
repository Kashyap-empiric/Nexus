# Nexus — Environment Variables

> **Last Updated:** 2026-06-16  
> **Purpose:** Complete catalog of all environment variables used by the application.

---

## Client (`client/src/config/env.ts`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | Supabase anonymous key |

## Server (`server/src/config/env.ts`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLIENT_URL` | ✅ | — | Frontend URL (CORS origin) |
| `PORT` | ❌ | `4000` | Server port |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ❌ | — | Upstash Redis URL |
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase service role key |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | — | Supabase publishable key |
| `RATE_LIMIT_WINDOW_MS` | ❌ | `900000` (15 min) | General rate limit window |
| `RATE_LIMIT_MAX` | ❌ | `1000` | General rate limit max requests |
| `MESSAGE_RATE_LIMIT_WINDOW_MS` | ❌ | `60000` (1 min) | Message rate limit window |
| `MESSAGE_RATE_LIMIT_MAX` | ❌ | `20` | Max messages per window |
| `PUSH_RATE_LIMIT_WINDOW_MS` | ❌ | `60000` (1 min) | Push rate limit window |
| `PUSH_RATE_LIMIT_MAX` | ❌ | `5` | Max pushes per window |
| `VAPID_PUBLIC_KEY` | ✅ | — | VAPID public key (push notifications) |
| `VAPID_PRIVATE_KEY` | ✅ | — | VAPID private key |
| `VAPID_SUBJECT` | ✅ | — | VAPID subject (mailto: or URL) |

---

## How to Add a New Environment Variable

1. Add to the appropriate `config/env.ts` file with a descriptive name
2. Add a fallback/default value where safe
3. Document in this file
4. Add to `.env.example` (if one exists)
5. For client-side vars, prefix with `NEXT_PUBLIC_`
