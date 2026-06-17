import { ENV } from "@/config/env.js";

/**
 * Extracts the internal storage path from a Supabase avatar public URL.
 * This is used to populate the avatarPath field for backward compatibility
 * with existing data that references avatars by storage path.
 *
 * @example
 * extractAvatarPath("https://project.supabase.co/storage/v1/object/public/avatars/userId/avatar-xxx.jpg")
 * // returns "userId/avatar-xxx.jpg"
 */
export function extractAvatarPath(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  const prefix = `${ENV.SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (avatarUrl.startsWith(prefix)) {
    return avatarUrl.slice(prefix.length);
  }
  return null;
}
