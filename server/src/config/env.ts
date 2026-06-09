export const ENV = {
  ALLOWED_ORIGINS: (process.env.CLIENT_URL || "").split(',').map(url => url.trim()),
  REDIS_URL: process.env.REDIS_URL,
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
};
