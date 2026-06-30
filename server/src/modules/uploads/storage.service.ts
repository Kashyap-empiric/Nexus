import { supabaseAdmin } from "@/lib/supabase.js";

export const StorageService = {
  async createSignedUrls(
    bucketName: string,
    paths: string[],
    expiresInSeconds: number = 3600
  ): Promise<Map<string, string>> {
    if (paths.length === 0) return new Map();

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrls(paths, expiresInSeconds);

    if (error || !data) {
      console.error(`[StorageService] Failed to create signed URLs for bucket ${bucketName}:`, error);
      return new Map();
    }

    const urlMap = new Map<string, string>();
    for (const d of data) {
      if (d.path && d.signedUrl) {
        urlMap.set(d.path, d.signedUrl);
      }
    }
    return urlMap;
  },

  async remove(bucketName: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove(paths);

    if (error) {
      console.error(`[StorageService] Failed to delete objects from bucket ${bucketName}:`, error);
      throw new Error(`Failed to delete objects from storage: ${error.message}`);
    }
  }
};
