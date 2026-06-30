import { describe, it, expect } from "vitest";
import { uploadAttachmentBodySchema } from "@/modules/uploads/uploads.schema.js";

describe("uploadAttachmentBodySchema", () => {
  it("rejects size over 10MB", () => {
    const payload = {
      originalName: "test.png",
      mimeType: "image/png",
      size: 11 * 1024 * 1024,
      fileName: "test.png",
      extension: "png",
      conversationId: "c38d3886-f3b1-4c1c-99fb-6a6c42967673"
    };
    
    const result = uploadAttachmentBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("File size exceeds 10MB limit");
    }
  });

  it("rejects invalid MIME types", () => {
    const payload = {
      originalName: "test.exe",
      mimeType: "application/x-msdownload",
      size: 1024,
      fileName: "test.exe",
      extension: "exe",
      conversationId: "c38d3886-f3b1-4c1c-99fb-6a6c42967673"
    };

    const result = uploadAttachmentBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
  
  it("accepts valid payloads", () => {
    const payload = {
      originalName: "test.png",
      mimeType: "image/png",
      size: 1024,
      fileName: "test.png",
      extension: "png",
      conversationId: "c38d3886-f3b1-4c1c-99fb-6a6c42967673"
    };
    
    const result = uploadAttachmentBodySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
