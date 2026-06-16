import { supabase } from "./supabase";

/**
 * Uploads an avatar image to Supabase Storage.
 * Restricts to images and enforces a basic max size (though the input should also check).
 * @returns The storage path or null if it failed.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File must be less than 5MB");
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPEG, and WEBP are allowed.");
  }

  const ext = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  const filePath = `${userId}/avatar_${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    throw error;
  }

  return data.path;
}

export async function deleteAvatar(path: string): Promise<void> {
  try {
    await supabase.storage.from("avatars").remove([path]);
  } catch (error) {
    console.warn("Failed to clean up avatar:", error);
  }
}

export function getAvatarPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
