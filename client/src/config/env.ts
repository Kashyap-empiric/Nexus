import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1, { message: "NEXT_PUBLIC_API_URL is required" }),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, { message: "NEXT_PUBLIC_SUPABASE_URL is required" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, { message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" }),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Client environment validation failed:\n${missing}\n\n` +
      "Check your .env.local or environment variables."
    );
  }

  return {
    API_URL: parsed.data.NEXT_PUBLIC_API_URL,
    SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  } as const;
}

export const ENV = loadEnv();
