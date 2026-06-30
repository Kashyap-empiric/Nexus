import * as z from "zod";

import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, UPLOAD_RULES } from "./uploads.constants.js";

const MimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);
const ExtensionSchema = z.enum(ALLOWED_EXTENSIONS);

export const uploadAttachmentBodySchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string()
    .transform(v => v.toLowerCase())
    .pipe(MimeTypeSchema),
  size: z.number().int().positive().max(UPLOAD_RULES.MAX_FILE_SIZE_BYTES, { message: "File size exceeds 10MB limit" }),
  fileName: z.string().min(1).max(255),
  extension: z.string()
    .transform(v => v.toLowerCase())
    .pipe(ExtensionSchema),
  width: z.number().int().positive().max(100000).optional(),
  height: z.number().int().positive().max(100000).optional(),
  conversationId: z.uuid(),
});

export const attachmentIdParamsSchema = z.object({
  id: z.string().cuid(),
});

export type UploadAttachmentBody = z.infer<typeof uploadAttachmentBodySchema>;
