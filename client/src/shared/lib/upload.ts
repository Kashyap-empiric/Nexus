import { supabase } from "./supabase";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

type UploadImageOptions = {
  bucket: string;
  folder: string;
  prefix: string;
  file: File;
  maxSizeMB?: number;
  allowedTypes?: string[];
};

async function uploadImage({
  bucket,
  folder,
  prefix,
  file,
  maxSizeMB = DEFAULT_MAX_SIZE,
  allowedTypes = ALLOWED_IMAGE_TYPES,
}: UploadImageOptions): Promise<string> {
  if (file.size > maxSizeMB) {
    throw new Error("File must be less than 5MB");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPEG, and WEBP are allowed.");
  }

  const ext = file.name.split(".").pop() || "png";
  const timestamp = Date.now();
  const filePath = `${folder}/${prefix}_${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (error) throw error;

  return data.path;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  return uploadImage({
    bucket: "avatars",
    folder: userId,
    prefix: "avatar",
    file,
  });
}

export async function uploadWorkspaceIcon(workspaceId: string, file: File): Promise<string> {
  return uploadImage({
    bucket: "avatars",
    folder: `workspaces/${workspaceId}`,
    prefix: "icon",
    file,
  });
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch (error) {
    console.warn(`Failed to delete file from ${bucket}:`, error);
  }
}

export async function deleteAvatar(pathOrUrl: string): Promise<void> {
  const path = pathOrUrl.startsWith("http")
    ? pathOrUrl.split("/public/avatars/").pop() || pathOrUrl
    : pathOrUrl;
  return deleteFile("avatars", path);
}

export function getPublicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function getAvatarPublicUrl(path: string | null): string | null {
  return getPublicUrl("avatars", path);
}

export function uploadAvatarAndGetUrl(userId: string, file: File): Promise<string> {
  return uploadImage({
    bucket: "avatars",
    folder: userId,
    prefix: "avatar",
    file,
  }).then(getAvatarPublicUrl) as Promise<string>;
}
