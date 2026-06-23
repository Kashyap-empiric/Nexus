import { ENV } from "@/config/env.js";


export function extractAvatarPath(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  const prefix = `${ENV.SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (avatarUrl.startsWith(prefix)) {
    return avatarUrl.slice(prefix.length);
  }
  return null;
}
