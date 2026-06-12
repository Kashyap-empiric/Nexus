export const ENV = {
  ALLOWED_ORIGINS: (process.env.CLIENT_URL || "").split(',').map(url => url.trim()),
  REDIS_URL: process.env.REDIS_URL,
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY!,
  CLIENT_URL: process.env.CLIENT_URL!,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 1000),
  MESSAGE_RATE_LIMIT_WINDOW_MS: Number(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  MESSAGE_RATE_LIMIT_MAX: Number(process.env.MESSAGE_RATE_LIMIT_MAX ?? 20),
};
