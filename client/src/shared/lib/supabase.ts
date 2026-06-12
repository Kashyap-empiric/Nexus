"use client"

import { createBrowserClient } from "@supabase/ssr";
import { ENV } from "@/config/env";

export const supabase = createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
