import { prisma } from "@/lib/db.js";
import type { UploadAttachmentBody } from "./uploads.schema.js";
import type { Attachment } from "@prisma/client";

export async function createAttachment(data: UploadAttachmentBody, userId: string, storagePath: string): Promise<Attachment> {
  return prisma.attachment.create({
    data: {
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath,
      extension: data.extension,
      width: data.width,
      height: data.height,
      conversationId: data.conversationId,
      createdBy: userId,
    },
  });
}

export async function getAttachmentById(id: string): Promise<Attachment | null> {
  return prisma.attachment.findUnique({
    where: { id },
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  await prisma.attachment.delete({
    where: { id },
  });
}
