import { describe, it, expect } from "vitest";

// extractAvatarPath reads ENV.SUPABASE_URL at call time, so we set it before import
process.env.SUPABASE_URL = "https://test-project.supabase.co";

const { extractAvatarPath } = await import("@/utils/upload.js");

describe("extractAvatarPath", () => {
  it("returns null for null input", () => {
    expect(extractAvatarPath(null)).toBeNull();
  });

  it("returns null for undefined-like falsy", () => {
    expect(extractAvatarPath("")).toBeNull();
  });

  it("extracts path from valid Supabase avatar URL", () => {
    const url = "https://test-project.supabase.co/storage/v1/object/public/avatars/user123/avatar-abc.jpg";
    expect(extractAvatarPath(url)).toBe("user123/avatar-abc.jpg");
  });

  it("returns null for URL from different origin", () => {
    const url = "https://other-service.com/storage/v1/object/public/avatars/user123/file.jpg";
    expect(extractAvatarPath(url)).toBeNull();
  });

  it("extracts path with nested folders", () => {
    const url = "https://test-project.supabase.co/storage/v1/object/public/avatars/org/team/user456/photo.png";
    expect(extractAvatarPath(url)).toBe("org/team/user456/photo.png");
  });

  it("is case-sensitive for the path prefix", () => {
    const url = "https://test-project.supabase.co/Storage/v1/object/public/avatars/user/file.jpg";
    expect(extractAvatarPath(url)).toBeNull();
  });

  it("handles URLs with query parameters", () => {
    const url = "https://test-project.supabase.co/storage/v1/object/public/avatars/user789/img.jpg?t=123456";
    expect(extractAvatarPath(url)).toBe("user789/img.jpg?t=123456");
  });
});
