import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, { message: "DATABASE_URL is required" }),
  SUPABASE_URL: z.string().min(1, { message: "SUPABASE_URL is required" }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: "SUPABASE_SERVICE_ROLE_KEY is required" }),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, { message: "SUPABASE_PUBLISHABLE_KEY is required" }),
  CLIENT_URL: z.string().min(1, { message: "CLIENT_URL is required" }),
  VAPID_PUBLIC_KEY: z.string().min(1, { message: "VAPID_PUBLIC_KEY is required" }),
  VAPID_PRIVATE_KEY: z.string().min(1, { message: "VAPID_PRIVATE_KEY is required" }),
  VAPID_SUBJECT: z.string().min(1, { message: "VAPID_SUBJECT is required" }),

  // Optional with defaults
  PORT: z.coerce.number().int().positive().default(4000),
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  MESSAGE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  MESSAGE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  PUSH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  PUSH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Server environment validation failed:\n${missing}\n\n` +
      "Check your .env file or environment variables."
    );
  }

  // Build the ALLOWED_ORIGINS from CLIENT_URL (supports comma-separated list)
  const allowedOrigins = parsed.data.CLIENT_URL.split(",").map((url) => url.trim());

  return {
    ...parsed.data,
    ALLOWED_ORIGINS: allowedOrigins,
  };
}

export type ServerEnv = ReturnType<typeof loadEnv>;

export const ENV = loadEnv();
